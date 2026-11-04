import Axios from "axios";
const axios = Axios.create({
	baseURL: process.env.NEXT_PUBLIC_API_URL,
	headers: {
		"X-Requested-With": "XMLHttpRequest",
		credentials: true,
		Accept: "application/json",
	},
	timeout: 30000,
	withCredentials: true,
});
axios.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		if (error?.response?.status === 401 && window.location.pathname !== "/") {
			window.location.replace("/");
		}
		return Promise.reject(error);
	}
);
export default axios;
