import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Lightweight JWT expiration check (checks exp claim)
 */
function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;

    // Base64Url decode
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    const now = Math.floor(Date.now() / 1000);
    
    // Check if token expires within the next 30 seconds to be safe
    return payload.exp && (payload.exp < now + 30);
  } catch (err) {
    return true; // Assume expired if invalid
  }
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const path = request.nextUrl.pathname;

  // Paths that require role checks
  const isManufacturerRoute = path.startsWith('/manufacturer');
  const isCustomerRoute = path.startsWith('/customer');
  const isPublicRoute = path === '/manufacturer/register' || path === '/manufacturer/login';

  let currentToken = accessToken;

  // 1. ATTEMPT REFRESH: If accessToken is missing or expired, but refreshToken exists
  if ((!accessToken || isTokenExpired(accessToken)) && refreshToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `refreshToken=${refreshToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Prepare response that will both let the request through AND set new cookies in the browser
        const nextResponse = NextResponse.next();
        
        // Set new cookies in the response for the browser
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
        };

        if (data.accessToken) {
          nextResponse.cookies.set('accessToken', data.accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60, // 15 mins
          });
          currentToken = data.accessToken;
        }

        if (data.refreshToken) {
          nextResponse.cookies.set('refreshToken', data.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60, // 7 days (matching SLIDING_WINDOW_MS)
          });
        }

        // Proceed to the original destination with updated session
        return nextResponse;
      }
    } catch (err) {
      console.error('[Middleware] Global refresh attempt failed:', err);
    }
  }

  // 2. AUTH GUARD: If still no valid token after refresh attempt
  if (!currentToken || isTokenExpired(currentToken)) {
    if (isManufacturerRoute && !isPublicRoute) {
      // Clear expired cookies and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('accessToken');
      response.cookies.delete('refreshToken');
      return response;
    }
    return NextResponse.next();
  }

  // 3. ROLE PROTECTION: Verify role from the valid currentToken
  try {
    const payloadBase64 = currentToken.split('.')[1];
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const decodedPayload = JSON.parse(jsonPayload);
    
    // Protect manufacturer routes
    if (isManufacturerRoute && decodedPayload.role !== 'manufacturer' && decodedPayload.role !== 'employee') {
      return NextResponse.redirect(new URL('/customer', request.url));
    }
    // Protect customer routes
    if (isCustomerRoute && decodedPayload.role !== 'customer') {
      return NextResponse.redirect(new URL('/manufacturer', request.url));
    }
  } catch (err) {
    // Should not happen as we checked validity above, but safety redirect
    if (isManufacturerRoute && !isPublicRoute) {
       return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/manufacturer/:path*',
    '/customer/:path*'
  ]
};
