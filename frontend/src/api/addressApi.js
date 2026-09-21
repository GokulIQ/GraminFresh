import axiosClient from './axiosClient';

export const getAddresses = async () => {
  const response = await axiosClient.get('/addresses/');
  return response.data;
};

export const addAddress = async (addressData) => {
  const response = await axiosClient.post('/addresses/', addressData);
  return response.data;
};

export const updateAddress = async (addressId, addressData) => {
  const response = await axiosClient.put(`/addresses/${addressId}`, addressData);
  return response.data;
};

export const deleteAddress = async (addressId) => {
  await axiosClient.delete(`/addresses/${addressId}`);
};

export const setDefaultAddress = async (addressId) => {
  const response = await axiosClient.put(`/addresses/${addressId}/default`);
  return response.data;
};
