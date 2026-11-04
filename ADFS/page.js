"use client";
import useAuth from "@app/hooks/useAuth";
import axios from "@app/lib/axios";
import Admin from "@components/Hero/Admin";
import Hero from "@components/Hero/Hero";
import Navigation from "@components/Navigation/Navigation";
import Loader from "@components/ui/Loader";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { DEFAULT_ERROR_MESSAGE, initialGeneralData } from "@utils/data";

export default function Home() {
	const { user, login } = useAuth();
	const [token, setToken] = useState("");
	const [errors, setErrors] = useState(null);

	const [loading, setLoading] = useState(true);
	const [header, setHeader] = useState({});
	const [general, setGeneral] = useState(initialGeneralData);
	const [hero, setHero] = useState({});
	const [websites, setWebsites] = useState([]);

	useEffect(() => {
		window.addEventListener("message", (event) => {
			setToken(event.data);
		});
	}, []);

	useEffect(() => {
		if (token && token.length) {
			login(setErrors, token);
		}
	}, [token, login]);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [headerRes, generalRes, heroRes, websitesRes] = await Promise.all(
					[
						axios.get("/header").catch((error) => {
							toast.error(
								error?.response?.data?.message ?? DEFAULT_ERROR_MESSAGE
							);
							return { data: {} };
						}),
						axios.get("/general").catch((error) => {
							toast.error(
								error?.response?.data?.message ?? DEFAULT_ERROR_MESSAGE
							);
							return { data: initialGeneralData };
						}),
						axios.get("/hero").catch((error) => {
							toast.error(
								error?.response?.data?.message ?? DEFAULT_ERROR_MESSAGE
							);
							return { data: { data: {} } };
						}),
						axios.get("/websites").catch((error) => {
							toast.error(
								error?.response?.data?.message ?? DEFAULT_ERROR_MESSAGE
							);
							return { data: { data: [] } };
						}),
					]
				);
				setHeader(headerRes?.data ?? {});
				setGeneral(
					generalRes?.data?.content && generalRes?.data?.content.length >= 1
						? generalRes?.data
						: initialGeneralData
				);
				setHero(heroRes?.data?.data ?? {});
				setWebsites(websitesRes?.data?.data ?? []);
			} catch (error) {
				toast.error(error?.response?.data?.message ?? DEFAULT_ERROR_MESSAGE);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	// HEADER
	async function getHeader() {
		try {
			const response = await axios.get("/header");

			setHeader(response?.data ?? {});
		} catch (error) {
			toast.error(error?.response?.data?.message ?? DEFAULT_ERROR_MESSAGE);
		}
	}
	async function updateHeader(data) {
		try {
			setLoading(true);
			if (data?.deleted) {
				const deleteRes = await axios.delete("/header", {
					data: data?.deleted,
				});

				toast.success(deleteRes?.data?.message || DEFAULT_ERROR_MESSAGE, {
					toastId: "UpdatedHeader",
				});
			}

			if (data?.created) {
				const formData = new FormData();
				data?.created?.forEach((icon, index) => {
					formData.append(`${index}[image]`, icon.image);
					formData.append(`${index}[position]`, icon.position);
				});

				const createdRes = await axios.post("/header", formData);

				toast.success(createdRes?.data?.message || DEFAULT_ERROR_MESSAGE, {
					toastId: "UpdatedHeader",
				});
			}

			if (data?.updated) {
				const updatedRes = await axios.put("/header", data?.updated);

				toast.success(updatedRes?.data?.message || DEFAULT_ERROR_MESSAGE, {
					toastId: "UpdatedHeader",
				});
			}

			await getHeader();
		} catch (error) {
			toast.error(error?.response?.data?.message ?? DEFAULT_ERROR_MESSAGE);
		} finally {
			setLoading(false);
		}
	}

	// GENERAL
	async function getGeneral() {
		try {
			const response = await axios.get("/general");

			setGeneral(
				response?.data?.content && response?.data?.content.length >= 1
					? response?.data
					: initialGeneralData
			);
		} catch (error) {
			toast.error(error?.response?.data?.message ?? DEFAULT_ERROR_MESSAGE);
		}
	}
	async function updateGeneral(data) {
		try {
			setLoading(true);
			const response = await axios.put("/general", data);
			await getGeneral();

			toast.success(response?.data?.message ?? DEFAULT_ERROR_MESSAGE);
		} catch (error) {
			toast.error(error?.response?.data?.message ?? DEFAULT_ERROR_MESSAGE);
		} finally {
			setLoading(false);
		}
	}

	// HERO
	async function getHero() {
		try {
			const response = await axios.get("/hero");
			setHero(response?.data?.data ?? {});
		} catch (error) {
			toast.error(error?.response?.data?.message ?? DEFAULT_ERROR_MESSAGE);
		}
	}
	async function updateHero(changedData, uuid) {
		const formData = new FormData();
		for (const key in changedData) {
			formData.append(key, changedData[key]);
		}

		try {
			setLoading(true);
			const response = await axios.post(`/hero/${uuid}`, formData);
			await getHero();

			toast.success(response?.data?.message ?? DEFAULT_ERROR_MESSAGE);
		} catch (error) {
			toast.error(error?.response?.data?.message ?? DEFAULT_ERROR_MESSAGE);
		} finally {
			setLoading(false);
		}
	}

	// WEBSITES
	async function getWebsites() {
		try {
			const response = await axios.get("/websites");
			setWebsites(response?.data?.data ?? []);
		} catch (error) {
			toast.error(error?.response?.data?.message ?? DEFAULT_ERROR_MESSAGE);
		}
	}
	async function updateWebsites(
		deletedWebsites,
		addedWebsites,
		editedWebsites
	) {
		const editedFormData = editedWebsites.length ? new FormData() : [];
		editedWebsites?.forEach((item, index) => {
			Object.keys(item).forEach((key) =>
				editedFormData.append(`${index}[${key}]`, item[key])
			);
		});

		const addedFormData = addedWebsites.length ? new FormData() : [];
		addedWebsites?.forEach((item, index) => {
			Object.keys(item).forEach((key) =>
				addedFormData.append(`${index}[${key}]`, item[key])
			);
		});
		setLoading(true);
		try {
			if (deletedWebsites.length) {
				const deleteRes = await axios.delete("/websites", {
					data: deletedWebsites,
				});
				toast.success(deleteRes?.data?.message || DEFAULT_ERROR_MESSAGE, {
					toastId: "UpdatedWebsites",
				});
			}
			if (addedFormData instanceof FormData) {
				const addRes = await axios.post("/websites", addedFormData);
				toast.success(addRes?.data?.message || DEFAULT_ERROR_MESSAGE, {
					toastId: "UpdatedWebsites",
				});
			}
			if (editedFormData instanceof FormData) {
				const editRes = await axios.post("/websites/update", editedFormData);
				toast.success(editRes?.data?.message || DEFAULT_ERROR_MESSAGE, {
					toastId: "UpdatedWebsites",
				});
			}

			await getWebsites();
		} catch (error) {
			toast.error(error?.response?.data?.message ?? DEFAULT_ERROR_MESSAGE);
		} finally {
			setLoading(false);
		}
	}

	return (
		<>
			{loading && <Loader errors={errors} />}
			<div
				id="page"
				className="w-full h-full  flex flex-col justify-between overflow-y-auto scroll-smooth overscroll-contain"
			>
				<div className="w-full flex-auto">
					<div className="flex flex-col w-full min-h-screen background  z-0 ">
						{/* top navigation bar + management screens */}
						<Admin
							user={user}
							header={header}
							general={general}
							hero={hero}
							websites={websites}
							updateHeader={updateHeader}
							updateGeneral={updateGeneral}
							updateHero={updateHero}
							updateWebsites={updateWebsites}
							setLoading={setLoading}
						/>
						<div id="main-content" tabIndex={-1} className="outline-none" />

						<section className="w-full pb-10">
							<Hero
								user={user}
								header={header}
								general={general}
								hero={hero}
								websites={websites}
								updateHeader={updateHeader}
								updateGeneral={updateGeneral}
								updateHero={updateHero}
								updateWebsites={updateWebsites}
								setLoading={setLoading}
							/>
						</section>
					</div>

					<section className="w-full h-fit pt-16 pb-14 surface-section">
						<Navigation websites={websites} />
					</section>
				</div>
				<footer
					id="footer"
					className="w-full py-4 bg-dark text-white/60 text-sm flex justify-center items-center z-10 border-t border-white/5"
				>
					פותח ע״י מסגרת אמ״ת
				</footer>
			</div>
			{
				<iframe
					src={`${process.env.NEXT_PUBLIC_ADFS_URL}/api/token`}
					className="absolute h-0 w-0 border-none invisible"
				></iframe>
			}
		</>
	);
}
