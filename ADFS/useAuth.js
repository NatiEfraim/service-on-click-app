"use client";
import useSWR from "swr";
import { useCallback, useState } from "react";
import axios from "../lib/axios";

export default function useAuth() {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const {
		data: user,
		error,
		mutate,
	} = useSWR(isAuthenticated ? "/user" : null, () =>
		axios.get("/user").then((res) => res.data.data)
	);

	const login = useCallback(
		async (setErrors, credentials) => {
			try {
				const loginResponse = await axios.post("/login", {
					token: credentials,
				});
				// admins and archive viewers sign in; regular users browse without management access
				const authenticated = ["admin", "archive_viewer"].includes(loginResponse?.data?.role?.[0]);
				setIsAuthenticated(authenticated);
				mutate();
				setIsLoading(false);
			} catch (error) {
				if (error?.code === "ERR_NETWORK") {
					setErrors("שגיאת רשת: לא ניתן להתחבר לשרת.");
				} else {
					setErrors(error.response.data);
				}
			}
		},
		[mutate]
	);

	return {
		user,
		login,
		isLoading,
	};
}
