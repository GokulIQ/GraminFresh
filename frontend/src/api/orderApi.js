import axiosClient from './axiosClient';

export const placeOrder = async (orderData) => {
  const response = await axiosClient.post('/orders/', orderData);
  return response.data;
};

export const getOrders = async () => {
  const response = await axiosClient.get('/orders/');
  return response.data;
};

export const getOrderDetails = async (orderId) => {
  const response = await axiosClient.get(`/orders/${orderId}`);
  return response.data;
};

export const trackOrder = async (orderId) => {
  const response = await axiosClient.get(`/orders/${orderId}/track`);
  return response.data;
};

export const cancelOrder = async (orderId, reason) => {
  const response = await axiosClient.post(`/orders/${orderId}/cancel`, { reason });
  return response.data;
};

export const reorderItems = async (orderId) => {
  const response = await axiosClient.post(`/orders/${orderId}/reorder`);
  return response.data;
};

export const deleteOrder = async (orderId) => {
  const response = await axiosClient.delete(`/orders/${orderId}`);
  return response.data;
};
