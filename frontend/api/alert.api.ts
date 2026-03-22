import client from "./client";

export interface Alert {
  _id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const getAlerts = async (signal?: AbortSignal) => {
  const response = await client.get("/alerts", { signal });
  return response.data.alerts as Alert[];
};

export const markAlertAsRead = async (id: string, signal?: AbortSignal) => {
  const response = await client.put(`/alerts/${id}/read`, null, { signal });
  return response.data;
};
