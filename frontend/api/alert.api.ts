import client from "./client";

export interface Alert {
  _id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const getAlerts = async () => {
  const response = await client.get("/alerts");
  return response.data.alerts as Alert[];
};

export const markAlertAsRead = async (id: string) => {
  const response = await client.put(`/alerts/${id}/read`);
  return response.data;
};
