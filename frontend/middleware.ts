import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const path = request.nextUrl.pathname;

  // Paths that require manufacturer or employee role
  const isManufacturerRoute = path.startsWith('/manufacturer');
  
  if (!token) {
    if (isManufacturerRoute) {
       return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  try {
    // Decode JWT payload without verifying signature (backend handles actual security)
    const payloadBase64 = token.split('.')[1];
    // Base64Url decode logic
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const decodedPayload = JSON.parse(jsonPayload);
    
    // Protect manufacturer routes
    if (isManufacturerRoute && decodedPayload.role !== 'manufacturer' && decodedPayload.role !== 'employee') {
      return NextResponse.redirect(new URL('/customer-home', request.url));
    }
  } catch (err) {
    // Invalid token format
    if (isManufacturerRoute) {
       return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/manufacturer/:path*'
  ]
};
