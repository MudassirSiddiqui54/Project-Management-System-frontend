import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useTheme } from "../ThemeContext";
import api from "../../api/axios";

export default function AcceptInvitation() {
	const [searchParams] = useSearchParams();
	const { token } = useParams();
	const projectId = searchParams.get("project");
	const navigate = useNavigate();
	const { user } = useAuth();
	const { isDark } = useTheme();
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("");
	const [success, setSuccess] = useState(false);
	const [processing, setProcessing] = useState(false);
	const hasRun = useRef(false);

	useEffect(() => {
		if (hasRun.current) return; // Prevent double execution
		hasRun.current = true;
		acceptInvitation();
	}, []);

	const acceptInvitation = async () => {
		if (processing) return;
		setProcessing(true);
		try {
			const projectId = searchParams.get("project");

			const response = await fetch(
				`https://project-management-system-8kdf.onrender.com/api/v1/projects/${projectId}/invitations/accept/${token}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
				},
			);

			const data = await response.json();

			if (!response.ok || data?.success === false) {
				throw new Error(data?.message || "Failed to accept invitation");
			}

			// Handle all possible actions
			switch (data?.data?.action) {
				case "register":
					if (!data?.data?.email) {
						throw new Error("Invitation email missing");
					}
					navigate(
						`/register?email=${data.data.email}&invitation=${token}&project=${projectId}`,
					);
					break;

				case "already_member":
				case "already_accepted":
					setSuccess(true);
					setMessage(
						`You are already a member of this project (${data.data.role})`,
					);
					setTimeout(() => {
						navigate(`/dashboard/projects/${projectId}`);
					}, 3000);
					break;

				case "joined":
					setSuccess(true);
					setMessage(
						`Successfully joined "${data.data.projectName}" as ${data.data.role}!`,
					);
					setTimeout(() => {
						if (user) {
							navigate(`/dashboard/projects/${projectId}`);
						} else {
							navigate(
								`/login?redirect=/dashboard/projects/${projectId}`,
							);
						}
					}, 3000);
					break;

				default:
					setMessage("Invitation processed");
					setTimeout(() => navigate("/dashboard"), 3000);
			}
		} catch (error) {
			console.error("Failed to accept invitation:", error);
			setMessage(error.message || "Invalid invitation");
		} finally {
			setLoading(false);
			setProcessing(false);
		}
	};

	if (loading) {
		return <div>Loading...</div>;
	}

	return (
		<div
			className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-950" : "bg-gray-50"}`}
		>
			<div
				className={`p-8 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"} max-w-md w-full`}
			>
				{success ? (
					<>
						<div className="text-green-500 text-center mb-4">✓</div>
						<h2
							className={`text-xl font-bold mb-2 text-center ${isDark ? "text-white" : "text-gray-900"}`}
						>
							Invitation Accepted!
						</h2>
					</>
				) : (
					<>
						<div className="text-red-500 text-center mb-4">✗</div>
						<h2
							className={`text-xl font-bold mb-2 text-center ${isDark ? "text-white" : "text-gray-900"}`}
						>
							Invitation Failed
						</h2>
					</>
				)}
				<p
					className={`text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}
				>
					{message}
				</p>
			</div>
		</div>
	);
}
