import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { useTheme } from "../ThemeContext.jsx";
import {
	getTaskDetails,
	updateTask,
	deleteTask,
	updateTaskStatus,
} from "../../api/task.api.js";
import {
	getTaskSubTasks,
	createSubTask,
	deleteSubTask,
	updateSubTaskStatus,
} from "../../api/subtask.api.js";
import { getProjectDetails } from "../../api/project.api.js";
import {
	ArrowLeftIcon,
	ClipboardDocumentCheckIcon,
	PencilIcon,
	TrashIcon,
	CheckCircleIcon,
	ClockIcon,
	FlagIcon,
	UserIcon,
	CalendarDaysIcon,
	TagIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	PlusIcon,
	XMarkIcon,
	ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export default function TaskDetailPage() {
	const { projectId, taskId } = useParams();
	const { user } = useAuth();
	const { isDark } = useTheme();
	const navigate = useNavigate();
	const [task, setTask] = useState(null);
	const [project, setProject] = useState(null);
	const [projectMembers, setProjectMembers] = useState([]);
	const [subtasks, setSubtasks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showAddSubtask, setShowAddSubtask] = useState(false);
	const [expandedSubtasks, setExpandedSubtasks] = useState({});
	const [updatingStatus, setUpdatingStatus] = useState(false);

	// Edit form state
	const [editForm, setEditForm] = useState({
		title: "",
		description: "",
		assignedTo: "",
		priority: "medium",
		dueDate: "",
		status: "todo",
		labels: [],
	});

	// New subtask form
	const [newSubtask, setNewSubtask] = useState({
		title: "",
		description: "",
		assignedTo: "",
	});

	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	useEffect(() => {
		if (taskId && projectId) {
			fetchTaskData();
		}
	}, [taskId, projectId]);

	const fetchTaskData = async () => {
		setLoading(true);
		setError("");
		try {
			// Fetch task details
			const taskResponse = await getTaskDetails(projectId, taskId);
			console.log("Task response:", taskResponse);

			const taskData = taskResponse.data?.data?.task;

			if (!taskData) {
				throw new Error("Task not found");
			}

			// Fetch project details to get members
			const projectResponse = await getProjectDetails(projectId);
			console.log("Project response:", projectResponse);

			const projectData = projectResponse.data?.data?.project;
			setProject(projectData);

			// Extract project members including owner - WITHOUT DUPLICATES
			const membersMap = new Map();

			// Add owner
			if (projectData?.owner) {
				membersMap.set(projectData.owner._id.toString(), {
					user: projectData.owner,
					role: "admin",
					isOwner: true,
				});
			}

			// Add other members (skip if they're the owner)
			if (projectData?.members && Array.isArray(projectData.members)) {
				projectData.members.forEach((member) => {
					const userId = member.user?._id || member.user;
					if (
						userId &&
						userId.toString() !== projectData.owner?._id?.toString()
					) {
						membersMap.set(userId.toString(), member);
					}
				});
			}

			setProjectMembers(Array.from(membersMap.values()));

			// Set task with safe defaults
			const taskWithDefaults = {
				...taskData,
				title: taskData.title || "Untitled Task",
				status: taskData.status || "todo",
				priority: taskData.priority || "medium",
				description: taskData.description || "",
				assignedTo: taskData.assignedTo || null,
				dueDate: taskData.dueDate || null,
				labels: taskData.labels || [],
				createdBy: taskData.createdBy || null,
				createdAt: taskData.createdAt || new Date().toISOString(),
				updatedAt: taskData.updatedAt || new Date().toISOString(),
			};

			setTask(taskWithDefaults);

			// Set edit form with current task data
			setEditForm({
				title: taskWithDefaults.title,
				description: taskWithDefaults.description || "",
				assignedTo: taskWithDefaults.assignedTo?._id || "",
				priority: taskWithDefaults.priority,
				dueDate: taskWithDefaults.dueDate
					? taskWithDefaults.dueDate.split("T")[0]
					: "",
				status: taskWithDefaults.status,
				labels: taskWithDefaults.labels,
			});

			// Fetch subtasks
			await fetchSubtasks();
		} catch (error) {
			console.error("Failed to fetch task data:", error);
			setError("Failed to load task details. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const fetchSubtasks = async () => {
		try {
			console.log("Fetching subtasks for task:", taskId);
			const response = await getTaskSubTasks(projectId, taskId);
			console.log("Subtasks response:", response);

			const subtasksData = response.data?.data?.subTasks || [];

			console.log("Raw subtasks data:", subtasksData);

			const processedSubtasks = subtasksData.map((subtask) => ({
				...subtask,
				_id: subtask._id,
				title: subtask.title || "Untitled Subtask",
				status: subtask.status || "todo",
				description: subtask.description || "",
				assignedTo: subtask.assignedTo || null,
				createdAt: subtask.createdAt || new Date().toISOString(),
			}));

			console.log("Processed subtasks:", processedSubtasks);
			setSubtasks(processedSubtasks);
		} catch (error) {
			console.error("Failed to fetch subtasks:", error);
			setSubtasks([]);
		}
	};

	const canEditTask = () => {
		if (!task || !user || !project) return false;

		const isTaskCreator = task.createdBy?._id === user._id;
		const isAssigned = task.assignedTo?._id === user._id;
		const isProjectOwner = project.owner?._id === user._id;
		const isProjectAdmin = project.members?.some(
			(m) => m.user?._id === user._id && m.role === "admin",
		);

		return isTaskCreator || isAssigned || isProjectOwner || isProjectAdmin;
	};

	const handleUpdateTask = async (e) => {
		e.preventDefault();

		try {
			// Only send fields that are in allowedUpdates and have changed
			const taskData = {};

			// Check each field and only add if it's different from current task
			if (editForm.title.trim() !== task.title) {
				taskData.title = editForm.title.trim();
			}

			if (editForm.description?.trim() !== task.description) {
				taskData.description = editForm.description?.trim() || "";
			}

			// Handle assignedTo - convert empty string to null
			const assignedToValue = editForm.assignedTo || null;
			const currentAssignedToId =
				task.assignedTo?._id || task.assignedTo || null;
			if (assignedToValue !== currentAssignedToId) {
				taskData.assignedTo = assignedToValue;
			}

			if (editForm.status !== task.status) {
				taskData.status = editForm.status;
			}

			if (editForm.priority !== task.priority) {
				taskData.priority = editForm.priority;
			}

			// Handle dueDate - convert empty string to null
			const dueDateValue = editForm.dueDate || null;
			const currentDueDate = task.dueDate
				? task.dueDate.split("T")[0]
				: null;
			if (dueDateValue !== currentDueDate) {
				taskData.dueDate = dueDateValue;
			}

			// Handle labels - only send if changed
			if (
				JSON.stringify(editForm.labels) !==
				JSON.stringify(task.labels || [])
			) {
				taskData.labels = editForm.labels || [];
			}

			// If no fields to update, show message and return
			if (Object.keys(taskData).length === 0) {
				setError("No changes to update");
				return;
			}

			console.log("Updating task with data:", taskData);

			const response = await updateTask(projectId, taskId, taskData);
			console.log("Update task response:", response);

			const updatedTask = response.data?.data?.task;

			if (!updatedTask) {
				throw new Error("No task data returned");
			}

			// Update local state with the response from backend
			setTask((prev) => ({
				...prev,
				...updatedTask,
				updatedAt: new Date().toISOString(),
			}));

			// Also update edit form to match the updated task
			setEditForm({
				title: updatedTask.title,
				description: updatedTask.description || "",
				assignedTo: updatedTask.assignedTo?._id || "",
				priority: updatedTask.priority,
				dueDate: updatedTask.dueDate
					? updatedTask.dueDate.split("T")[0]
					: "",
				status: updatedTask.status,
				labels: updatedTask.labels || [],
			});

			setShowEditModal(false);
			setSuccess("Task updated successfully!");
			setTimeout(() => setSuccess(""), 3000);
		} catch (error) {
			console.error("Failed to update task:", error);
			console.error("Error response:", error.response?.data);

			// Show specific validation errors from backend
			const errorMessage =
				error.response?.data?.message ||
				"Failed to update task. Please try again.";

			setError(errorMessage);
		}
	};

	const handleDeleteTask = async () => {
		try {
			await deleteTask(projectId, taskId);
			setSuccess("Task deleted successfully!");
			navigate(`/dashboard/projects/${projectId}?tab=tasks`);
		} catch (error) {
			console.error("Failed to delete task:", error);
			setError(
				error.response?.data?.message ||
					"Failed to delete task. Please try again.",
			);
		}
	};

	const handleUpdateStatus = async (newStatus) => {
		if (updatingStatus) return;

		setUpdatingStatus(true);
		try {
			await updateTaskStatus(projectId, taskId, newStatus);

			setTask((prev) => ({
				...prev,
				status: newStatus,
				updatedAt: new Date().toISOString(),
			}));

			setSuccess(`Task marked as ${newStatus.replace("-", " ")}!`);
			setTimeout(() => setSuccess(""), 3000);
		} catch (error) {
			console.error("Failed to update task status:", error);
			setError(
				error.response?.data?.message ||
					"Failed to update task status. Please try again.",
			);
		} finally {
			setUpdatingStatus(false);
		}
	};

	const handleAddSubtask = async (e) => {
		e.preventDefault();

		if (!newSubtask.title.trim()) {
			setError("Subtask title is required");
			return;
		}

		try {
			const subtaskData = {
				title: newSubtask.title.trim(),
				description: newSubtask.description?.trim() || "",
				assignedTo: newSubtask.assignedTo || null,
			};

			console.log("Creating subtask with data:", subtaskData);
			const response = await createSubTask(
				projectId,
				taskId,
				subtaskData,
			);
			console.log("Create subtask response:", response);

			const createdSubtask = response.data?.data?.subTask;

			if (!createdSubtask) {
				throw new Error("No subtask data returned");
			}

			const subtaskWithDefaults = {
				...createdSubtask,
				_id: createdSubtask._id,
				title: createdSubtask.title || newSubtask.title,
				status: createdSubtask.status || "todo",
				description:
					createdSubtask.description || newSubtask.description,
				assignedTo: createdSubtask.assignedTo || null,
				createdAt: createdSubtask.createdAt || new Date().toISOString(),
			};

			setSubtasks((prev) => [...prev, subtaskWithDefaults]);
			setNewSubtask({ title: "", description: "", assignedTo: "" });
			setShowAddSubtask(false);
			setSuccess("Subtask added successfully!");
			setTimeout(() => setSuccess(""), 3000);
		} catch (error) {
			console.error("Failed to add subtask:", error);
			setError(
				error.response?.data?.message ||
					"Failed to add subtask. Please try again.",
			);
		}
	};

	const handleUpdateSubtaskStatus = async (subtaskId, newStatus) => {
		if (!subtaskId) {
			setError("Cannot update subtask: Invalid subtask ID");
			return;
		}

		try {
			await updateSubTaskStatus(projectId, subtaskId, newStatus);

			setSubtasks((prev) =>
				prev.map((subtask) => {
					if (subtask._id === subtaskId) {
						return {
							...subtask,
							status: newStatus,
							completedAt:
								newStatus === "done"
									? new Date().toISOString()
									: null,
						};
					}
					return subtask;
				}),
			);
		} catch (error) {
			console.error("Failed to update subtask status:", error);
			setError(
				error.response?.data?.message ||
					"Failed to update subtask status. Please try again.",
			);
		}
	};

	const handleDeleteSubtask = async (subtaskId) => {
		if (!subtaskId) {
			setError("Cannot delete subtask: Invalid subtask ID");
			return;
		}

		if (!window.confirm("Are you sure you want to delete this subtask?")) {
			return;
		}

		try {
			await deleteSubTask(projectId, subtaskId);

			setSubtasks((prev) =>
				prev.filter((subtask) => subtask._id !== subtaskId),
			);
			setSuccess("Subtask deleted successfully!");
			setTimeout(() => setSuccess(""), 3000);
		} catch (error) {
			console.error("Failed to delete subtask:", error);
			setError(
				error.response?.data?.message ||
					"Failed to delete subtask. Please try again.",
			);
		}
	};

	const toggleSubtaskExpansion = (subtaskId) => {
		setExpandedSubtasks((prev) => ({
			...prev,
			[subtaskId]: !prev[subtaskId],
		}));
	};

	const getStatusBadge = (status) => {
		const safeStatus = status || "todo";
		const styles = {
			todo: isDark
				? "bg-gray-800 text-gray-300"
				: "bg-gray-100 text-gray-700",
			"in-progress": isDark
				? "bg-blue-900/30 text-blue-400"
				: "bg-blue-100 text-blue-700",
			review: isDark
				? "bg-yellow-900/30 text-yellow-400"
				: "bg-yellow-100 text-yellow-700",
			done: isDark
				? "bg-green-900/30 text-green-400"
				: "bg-green-100 text-green-700",
			blocked: isDark
				? "bg-red-900/30 text-red-400"
				: "bg-red-100 text-red-700",
		};
		return (
			styles[safeStatus] ||
			(isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700")
		);
	};

	const getPriorityBadge = (priority) => {
		const safePriority = priority || "medium";
		const styles = {
			low: isDark
				? "bg-gray-800 text-gray-300"
				: "bg-gray-100 text-gray-700",
			medium: isDark
				? "bg-yellow-900/30 text-yellow-400"
				: "bg-yellow-100 text-yellow-700",
			high: isDark
				? "bg-orange-900/30 text-orange-400"
				: "bg-orange-100 text-orange-700",
			critical: isDark
				? "bg-red-900/30 text-red-400"
				: "bg-red-100 text-red-700",
		};
		return (
			styles[safePriority] ||
			(isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700")
		);
	};

	const getPriorityIcon = (priority) => {
		const safePriority = priority || "medium";
		const icons = {
			low: <FlagIcon className="h-4 w-4 text-gray-500" />,
			medium: <FlagIcon className="h-4 w-4 text-yellow-500" />,
			high: <FlagIcon className="h-4 w-4 text-orange-500" />,
			critical: <FlagIcon className="h-4 w-4 text-red-500" />,
		};
		return (
			icons[safePriority] || (
				<FlagIcon className="h-4 w-4 text-gray-500" />
			)
		);
	};

	const formatDate = (dateString) => {
		if (!dateString) return "N/A";
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatRelativeTime = (dateString) => {
		if (!dateString) return "";
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now - date;
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMins < 60)
			return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
		if (diffHours < 24)
			return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
		if (diffDays < 7)
			return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

		return formatDate(dateString);
	};

	const calculateSubtaskProgress = () => {
		if (subtasks.length === 0)
			return { percent: 0, completed: 0, total: 0 };
		const completed = subtasks.filter((st) => st.status === "done").length;
		const percent = Math.round((completed / subtasks.length) * 100);
		return { percent, completed, total: subtasks.length };
	};

	if (loading) {
		return (
			<div
				className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-950" : "bg-gray-50"}`}
			>
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto mb-4"></div>
					<p className={isDark ? "text-gray-400" : "text-gray-600"}>
						Loading task details...
					</p>
				</div>
			</div>
		);
	}

	if (!task) {
		return (
			<div
				className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-950" : "bg-gray-50"}`}
			>
				<div className="text-center max-w-md">
					<ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
					<h2
						className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
					>
						Task Not Found
					</h2>
					<p
						className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}
					>
						The task you're looking for doesn't exist or you don't
						have access.
					</p>
					<button
						onClick={() =>
							navigate(
								`/dashboard/projects/${projectId}?tab=tasks`,
							)
						}
						className="px-6 py-3 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-lg font-medium hover:from-lime-600 hover:to-lime-700"
					>
						Back to Tasks
					</button>
				</div>
			</div>
		);
	}

	const progress = calculateSubtaskProgress();
	const userCanEdit = canEditTask();

	return (
		<div
			className={`min-h-screen ${isDark ? "bg-gray-950" : "bg-gray-50"}`}
		>
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-4">
							<button
								onClick={() =>
									navigate(
										`/dashboard/projects/${projectId}?tab=tasks`,
									)
								}
								className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
							>
								<ArrowLeftIcon className="h-5 w-5" />
							</button>
							<div>
								<div className="flex items-center gap-3 mb-2">
									<h1
										className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
									>
										{task.title}
									</h1>
									<div className="flex items-center gap-2">
										<span
											className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(task.status)}`}
										>
											{(task.status || "todo")
												.replace("-", " ")
												.toUpperCase()}
										</span>
										<span
											className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(task.priority)} flex items-center gap-1`}
										>
											{getPriorityIcon(task.priority)}
											{(
												task.priority || "medium"
											).toUpperCase()}
										</span>
									</div>
								</div>
								{project && (
									<div className="flex items-center gap-2">
										<span
											className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
										>
											Project:
										</span>
										<Link
											to={`/dashboard/projects/${project._id}`}
											className={`text-sm font-medium ${isDark ? "text-lime-400 hover:text-lime-300" : "text-lime-600 hover:text-lime-800"}`}
										>
											{project.name}
										</Link>
									</div>
								)}
							</div>
						</div>

						{userCanEdit && (
							<div className="flex items-center gap-2">
								<button
									onClick={() => setShowEditModal(true)}
									className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
										isDark
											? "bg-gray-800 text-gray-300 hover:bg-gray-700"
											: "bg-gray-100 text-gray-700 hover:bg-gray-200"
									}`}
								>
									<PencilIcon className="h-4 w-4" />
									Edit
								</button>
								<button
									onClick={() => setShowDeleteConfirm(true)}
									className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
										isDark
											? "bg-red-900/30 text-red-400 hover:bg-red-900/50"
											: "bg-red-50 text-red-600 hover:bg-red-100"
									}`}
								>
									<TrashIcon className="h-4 w-4" />
									Delete
								</button>
							</div>
						)}
					</div>

					{success && (
						<div
							className={`mb-6 p-4 rounded-lg ${isDark ? "bg-green-900/30 border border-green-800" : "bg-green-50 border border-green-200"}`}
						>
							<div className="flex items-center justify-between">
								<p className="text-green-500">{success}</p>
								<button onClick={() => setSuccess("")}>
									<XMarkIcon className="h-4 w-4 text-green-500" />
								</button>
							</div>
						</div>
					)}

					{error && (
						<div
							className={`mb-6 p-4 rounded-lg ${isDark ? "bg-red-900/30 border border-red-800" : "bg-red-50 border border-red-200"}`}
						>
							<div className="flex items-center justify-between">
								<p className="text-red-500">{error}</p>
								<button onClick={() => setError("")}>
									<XMarkIcon className="h-4 w-4 text-red-500" />
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Main Content */}
				<div className="grid lg:grid-cols-3 gap-8">
					{/* Left Column - Task Details */}
					<div className="lg:col-span-2 space-y-8">
						{/* Description */}
						<div
							className={`rounded-2xl border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"} p-6`}
						>
							<h2
								className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
							>
								Description
							</h2>
							<div
								className={`prose max-w-none ${isDark ? "prose-invert" : ""}`}
							>
								{task.description ? (
									<p
										className={`whitespace-pre-wrap ${isDark ? "text-gray-300" : "text-gray-700"}`}
									>
										{task.description}
									</p>
								) : (
									<p
										className={`italic ${isDark ? "text-gray-500" : "text-gray-500"}`}
									>
										No description provided.
									</p>
								)}
							</div>
						</div>

						{/* Subtasks */}
						<div
							className={`rounded-2xl border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"} p-6`}
						>
							<div className="flex items-center justify-between mb-6">
								<div>
									<h2
										className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
									>
										Subtasks
									</h2>
									{subtasks.length > 0 && (
										<p
											className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
										>
											{progress.completed} of{" "}
											{progress.total} completed (
											{progress.percent}%)
										</p>
									)}
								</div>
								{userCanEdit && (
									<button
										onClick={() => setShowAddSubtask(true)}
										className="px-4 py-2 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-lg font-medium hover:from-lime-600 hover:to-lime-700 flex items-center gap-2"
									>
										<PlusIcon className="h-4 w-4" />
										Add Subtask
									</button>
								)}
							</div>

							{subtasks.length > 0 && (
								<div className="mb-6">
									<div
										className={`h-2 rounded-full ${isDark ? "bg-gray-800" : "bg-gray-200"}`}
									>
										<div
											className="h-full rounded-full bg-lime-500 transition-all duration-300"
											style={{
												width: `${progress.percent}%`,
											}}
										/>
									</div>
								</div>
							)}

							{subtasks.length === 0 ? (
								<div className="text-center py-8">
									<ClipboardDocumentCheckIcon
										className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-gray-700" : "text-gray-300"}`}
									/>
									<h3
										className={`text-lg font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
									>
										No subtasks yet
									</h3>
									<p
										className={`mb-6 ${isDark ? "text-gray-500" : "text-gray-500"}`}
									>
										Break down this task into smaller,
										manageable subtasks.
									</p>
									{userCanEdit && (
										<button
											onClick={() =>
												setShowAddSubtask(true)
											}
											className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-lg font-medium hover:from-lime-600 hover:to-lime-700"
										>
											<PlusIcon className="h-4 w-4" />
											Create First Subtask
										</button>
									)}
								</div>
							) : (
								<div className="space-y-3">
									{subtasks.map((subtask) => {
										const safeSubtaskStatus =
											subtask.status || "todo";
										return (
											<div
												key={subtask._id}
												className={`rounded-xl border ${isDark ? "border-gray-800 bg-gray-900/30" : "border-gray-200 bg-gray-50"} overflow-hidden`}
											>
												<div className="p-4">
													<div className="flex items-start gap-3">
														{/* Status Checkbox */}
														<button
															onClick={() =>
																handleUpdateSubtaskStatus(
																	subtask._id,
																	safeSubtaskStatus ===
																		"done"
																		? "todo"
																		: "done",
																)
															}
															className={`mt-1 h-5 w-5 rounded border flex items-center justify-center ${
																safeSubtaskStatus ===
																"done"
																	? "bg-green-500 border-green-500"
																	: isDark
																		? "border-gray-600"
																		: "border-gray-300"
															}`}
														>
															{safeSubtaskStatus ===
																"done" && (
																<CheckCircleIcon className="h-3 w-3 text-white" />
															)}
														</button>

														{/* Subtask Content */}
														<div className="flex-1">
															<div className="flex items-start justify-between">
																<div>
																	<h3
																		className={`font-medium ${isDark ? "text-white" : "text-gray-900"} ${
																			safeSubtaskStatus ===
																			"done"
																				? "line-through opacity-70"
																				: ""
																		}`}
																	>
																		{
																			subtask.title
																		}
																	</h3>
																	{subtask.description && (
																		<p
																			className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
																		>
																			{
																				subtask.description
																			}
																		</p>
																	)}
																</div>

																<div className="flex items-center gap-2">
																	{subtask.assignedTo && (
																		<span
																			className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
																		>
																			{subtask
																				.assignedTo
																				.username ||
																				"Assigned"}
																		</span>
																	)}
																	{userCanEdit && (
																		<button
																			onClick={() =>
																				handleDeleteSubtask(
																					subtask._id,
																				)
																			}
																			className={`p-1 rounded ${
																				isDark
																					? "hover:bg-red-900/30 text-red-400"
																					: "hover:bg-red-50 text-red-600"
																			}`}
																		>
																			<TrashIcon className="h-4 w-4" />
																		</button>
																	)}
																	<button
																		onClick={() =>
																			toggleSubtaskExpansion(
																				subtask._id,
																			)
																		}
																		className={`p-1 rounded ${
																			isDark
																				? "hover:bg-gray-800 text-gray-400"
																				: "hover:bg-gray-100 text-gray-600"
																		}`}
																	>
																		{expandedSubtasks[
																			subtask
																				._id
																		] ? (
																			<ChevronUpIcon className="h-4 w-4" />
																		) : (
																			<ChevronDownIcon className="h-4 w-4" />
																		)}
																	</button>
																</div>
															</div>

															{/* Expanded Details */}
															{expandedSubtasks[
																subtask._id
															] && (
																<div
																	className={`mt-4 pt-4 border-t ${isDark ? "border-gray-800" : "border-gray-200"}`}
																>
																	<div className="grid grid-cols-2 gap-4 text-sm">
																		<div>
																			<span
																				className={
																					isDark
																						? "text-gray-500"
																						: "text-gray-600"
																				}
																			>
																				Status:
																			</span>
																			<span
																				className={`ml-2 px-2 py-1 rounded-full ${getStatusBadge(safeSubtaskStatus)}`}
																			>
																				{safeSubtaskStatus
																					.replace(
																						"-",
																						" ",
																					)
																					.toUpperCase()}
																			</span>
																		</div>
																		<div>
																			<span
																				className={
																					isDark
																						? "text-gray-500"
																						: "text-gray-600"
																				}
																			>
																				Created:
																			</span>
																			<span className="ml-2">
																				{formatRelativeTime(
																					subtask.createdAt,
																				)}
																			</span>
																		</div>
																		{subtask.completedAt && (
																			<div>
																				<span
																					className={
																						isDark
																							? "text-gray-500"
																							: "text-gray-600"
																					}
																				>
																					Completed:
																				</span>
																				<span className="ml-2">
																					{formatRelativeTime(
																						subtask.completedAt,
																					)}
																				</span>
																			</div>
																		)}
																	</div>
																</div>
															)}
														</div>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>

					{/* Right Column - Task Info & Actions */}
					<div className="space-y-6">
						{/* Quick Actions */}
						<div
							className={`rounded-2xl border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"} p-6`}
						>
							<h2
								className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
							>
								Quick Actions
							</h2>

							<div className="space-y-3">
								{/* Status Update */}
								<div>
									<label
										className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
									>
										Update Status
									</label>
									<div className="grid grid-cols-2 gap-2">
										{[
											"todo",
											"in-progress",
											"review",
											"done",
										].map((status) => (
											<button
												key={status}
												onClick={() =>
													handleUpdateStatus(status)
												}
												disabled={
													task.status === status ||
													updatingStatus
												}
												className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
													task.status === status
														? isDark
															? "bg-lime-900/30 text-lime-400 border border-lime-500/50"
															: "bg-lime-50 text-lime-700 border border-lime-500"
														: isDark
															? "bg-gray-800 text-gray-300 hover:bg-gray-700"
															: "bg-gray-100 text-gray-700 hover:bg-gray-200"
												} disabled:opacity-50 disabled:cursor-not-allowed`}
											>
												{status
													.replace("-", " ")
													.toUpperCase()}
											</button>
										))}
									</div>
								</div>
							</div>
						</div>

						{/* Task Information */}
						<div
							className={`rounded-2xl border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"} p-6`}
						>
							<h2
								className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
							>
								Task Information
							</h2>

							<div className="space-y-4">
								{/* Assigned To */}
								<div>
									<h3
										className={`text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
									>
										<UserIcon className="h-4 w-4 inline mr-1" />
										Assigned To
									</h3>
									{task.assignedTo ? (
										<div className="flex items-center gap-2 mt-1">
											<div className="h-8 w-8 rounded-full bg-gradient-to-r from-lime-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
												{task.assignedTo.username
													?.charAt(0)
													.toUpperCase()}
											</div>
											<div>
												<p
													className={
														isDark
															? "text-gray-300"
															: "text-gray-700"
													}
												>
													{task.assignedTo.username}
												</p>
												<p
													className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}
												>
													{task.assignedTo.email}
												</p>
											</div>
										</div>
									) : (
										<p
											className={`italic ${isDark ? "text-gray-500" : "text-gray-500"}`}
										>
											Unassigned
										</p>
									)}
								</div>

								{/* Created By */}
								<div>
									<h3
										className={`text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
									>
										Created By
									</h3>
									<div className="flex items-center gap-2 mt-1">
										<div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
											{task.createdBy?.username
												?.charAt(0)
												.toUpperCase() || "?"}
										</div>
										<div>
											<p
												className={
													isDark
														? "text-gray-300"
														: "text-gray-700"
												}
											>
												{task.createdBy?.username ||
													"Unknown"}
											</p>
											<p
												className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}
											>
												{formatRelativeTime(
													task.createdAt,
												)}
											</p>
										</div>
									</div>
								</div>

								{/* Due Date */}
								<div>
									<h3
										className={`text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
									>
										<CalendarDaysIcon className="h-4 w-4 inline mr-1" />
										Due Date
									</h3>
									<p
										className={
											isDark
												? "text-gray-300"
												: "text-gray-700"
										}
									>
										{task.dueDate
											? formatDate(task.dueDate)
											: "No due date"}
									</p>
								</div>

								{/* Labels */}
								{task.labels && task.labels.length > 0 && (
									<div>
										<h3
											className={`text-sm font-medium mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
										>
											<TagIcon className="h-4 w-4 inline mr-1" />
											Labels
										</h3>
										<div className="flex flex-wrap gap-2">
											{task.labels.map((label, index) => (
												<span
													key={index}
													className={`px-3 py-1 rounded-full text-sm ${
														isDark
															? "bg-gray-800 text-gray-300"
															: "bg-gray-100 text-gray-700"
													}`}
												>
													{label}
												</span>
											))}
										</div>
									</div>
								)}

								{/* Timestamps */}
								<div
									className={`pt-4 border-t ${isDark ? "border-gray-800" : "border-gray-200"}`}
								>
									<div className="space-y-2">
										<div className="flex justify-between text-sm">
											<span
												className={
													isDark
														? "text-gray-500"
														: "text-gray-600"
												}
											>
												Created
											</span>
											<span
												className={
													isDark
														? "text-gray-300"
														: "text-gray-700"
												}
											>
												{formatRelativeTime(
													task.createdAt,
												)}
											</span>
										</div>
										<div className="flex justify-between text-sm">
											<span
												className={
													isDark
														? "text-gray-500"
														: "text-gray-600"
												}
											>
												Last Updated
											</span>
											<span
												className={
													isDark
														? "text-gray-300"
														: "text-gray-700"
												}
											>
												{formatRelativeTime(
													task.updatedAt,
												)}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Edit Task Modal */}
			{showEditModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div
						className={`w-full max-w-2xl rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"} p-6`}
					>
						<div className="flex items-center justify-between mb-6">
							<h3
								className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
							>
								<PencilIcon className="h-5 w-5 inline mr-2" />
								Edit Task
							</h3>
							<button
								onClick={() => setShowEditModal(false)}
								className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
							>
								<XMarkIcon className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={handleUpdateTask}>
							<div className="space-y-6">
								<div className="grid md:grid-cols-2 gap-6">
									{/* Task Title */}
									<div className="md:col-span-2">
										<label
											className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
										>
											Task Title *
										</label>
										<input
											type="text"
											value={editForm.title}
											onChange={(e) =>
												setEditForm({
													...editForm,
													title: e.target.value,
												})
											}
											className={`w-full px-4 py-3 rounded-lg border ${
												isDark
													? "border-gray-700 bg-gray-800 text-white focus:border-lime-500"
													: "border-gray-300 bg-white text-gray-900 focus:border-lime-500"
											} focus:ring-2 focus:ring-lime-500/20 focus:outline-none`}
											required
										/>
									</div>

									{/* Description */}
									<div className="md:col-span-2">
										<label
											className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
										>
											Description
										</label>
										<textarea
											value={editForm.description}
											onChange={(e) =>
												setEditForm({
													...editForm,
													description: e.target.value,
												})
											}
											rows="4"
											className={`w-full px-4 py-3 rounded-lg border ${
												isDark
													? "border-gray-700 bg-gray-800 text-white"
													: "border-gray-300 bg-white text-gray-900"
											}`}
										/>
									</div>

									{/* Status */}
									<div>
										<label
											className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
										>
											Status
										</label>
										<select
											value={editForm.status}
											onChange={(e) =>
												setEditForm({
													...editForm,
													status: e.target.value,
												})
											}
											className={`w-full px-4 py-3 rounded-lg border ${
												isDark
													? "border-gray-700 bg-gray-800 text-white"
													: "border-gray-300 bg-white text-gray-900"
											}`}
										>
											<option value="todo">To Do</option>
											<option value="in-progress">
												In Progress
											</option>
											<option value="review">
												Review
											</option>
											<option value="done">Done</option>
											<option value="blocked">
												Blocked
											</option>
										</select>
									</div>

									{/* Priority */}
									<div>
										<label
											className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
										>
											Priority
										</label>
										<select
											value={editForm.priority}
											onChange={(e) =>
												setEditForm({
													...editForm,
													priority: e.target.value,
												})
											}
											className={`w-full px-4 py-3 rounded-lg border ${
												isDark
													? "border-gray-700 bg-gray-800 text-white"
													: "border-gray-300 bg-white text-gray-900"
											}`}
										>
											<option value="low">Low</option>
											<option value="medium">
												Medium
											</option>
											<option value="high">High</option>
											<option value="critical">
												Critical
											</option>
										</select>
									</div>

									{/* Due Date */}
									<div>
										<label
											className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
										>
											Due Date
										</label>
										<input
											type="date"
											value={editForm.dueDate}
											onChange={(e) =>
												setEditForm({
													...editForm,
													dueDate: e.target.value,
												})
											}
											className={`w-full px-4 py-3 rounded-lg border ${
												isDark
													? "border-gray-700 bg-gray-800 text-white"
													: "border-gray-300 bg-white text-gray-900"
											}`}
										/>
									</div>

									{/* Assigned To */}
									<div>
										<label
											className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
										>
											Assign To
										</label>
										<select
											value={editForm.assignedTo}
											onChange={(e) =>
												setEditForm({
													...editForm,
													assignedTo: e.target.value,
												})
											}
											className={`w-full px-4 py-3 rounded-lg border ${
												isDark
													? "border-gray-700 bg-gray-800 text-white"
													: "border-gray-300 bg-white text-gray-900"
											}`}
										>
											<option value="">Unassigned</option>
											<option value={user?._id}>
												Assign to me
											</option>
											{projectMembers.map((member) => {
												const memberUser =
													member.user || member;
												return (
													<option
														key={memberUser._id}
														value={memberUser._id}
													>
														{memberUser.username ||
															memberUser.name ||
															memberUser.email}{" "}
														{member.isOwner
															? "(Owner)"
															: ""}
													</option>
												);
											})}
										</select>
									</div>
								</div>
							</div>

							<div className="flex items-center gap-3 mt-6">
								<button
									type="submit"
									className="flex-1 px-6 py-3 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-lg font-medium hover:from-lime-600 hover:to-lime-700"
								>
									Save Changes
								</button>
								<button
									type="button"
									onClick={() => setShowEditModal(false)}
									className={`flex-1 px-6 py-3 rounded-lg font-medium ${
										isDark
											? "bg-gray-800 text-gray-300 hover:bg-gray-700"
											: "bg-gray-100 text-gray-700 hover:bg-gray-200"
									}`}
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Add Subtask Modal */}
			{showAddSubtask && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div
						className={`w-full max-w-md rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"} p-6`}
					>
						<div className="flex items-center justify-between mb-6">
							<h3
								className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
							>
								<PlusIcon className="h-5 w-5 inline mr-2" />
								Add Subtask
							</h3>
							<button
								onClick={() => setShowAddSubtask(false)}
								className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
							>
								<XMarkIcon className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={handleAddSubtask}>
							<div className="space-y-4">
								<div>
									<label
										className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
									>
										Subtask Title *
									</label>
									<input
										type="text"
										value={newSubtask.title}
										onChange={(e) =>
											setNewSubtask({
												...newSubtask,
												title: e.target.value,
											})
										}
										placeholder="What needs to be done?"
										className={`w-full px-4 py-3 rounded-lg border ${
											isDark
												? "border-gray-700 bg-gray-800 text-white focus:border-lime-500"
												: "border-gray-300 bg-white text-gray-900 focus:border-lime-500"
										} focus:ring-2 focus:ring-lime-500/20 focus:outline-none`}
										required
									/>
								</div>

								<div>
									<label
										className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
									>
										Description (Optional)
									</label>
									<textarea
										value={newSubtask.description}
										onChange={(e) =>
											setNewSubtask({
												...newSubtask,
												description: e.target.value,
											})
										}
										placeholder="Add details or context..."
										rows="3"
										className={`w-full px-4 py-3 rounded-lg border ${
											isDark
												? "border-gray-700 bg-gray-800 text-white"
												: "border-gray-300 bg-white text-gray-900"
										}`}
									/>
								</div>

								<div>
									<label
										className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
									>
										Assign To (Optional)
									</label>
									<select
										value={newSubtask.assignedTo}
										onChange={(e) =>
											setNewSubtask({
												...newSubtask,
												assignedTo: e.target.value,
											})
										}
										className={`w-full px-4 py-3 rounded-lg border ${
											isDark
												? "border-gray-700 bg-gray-800 text-white"
												: "border-gray-300 bg-white text-gray-900"
										}`}
									>
										<option value="">Unassigned</option>
										<option value={user?._id}>
											Assign to me
										</option>
										{projectMembers.map((member) => {
											const memberUser =
												member.user || member;
											return (
												<option
													key={memberUser._id}
													value={memberUser._id}
												>
													{memberUser.username ||
														memberUser.name ||
														memberUser.email}
												</option>
											);
										})}
									</select>
								</div>
							</div>

							<div className="flex items-center gap-3 mt-6">
								<button
									type="submit"
									className="flex-1 px-6 py-3 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-lg font-medium hover:from-lime-600 hover:to-lime-700"
								>
									Add Subtask
								</button>
								<button
									type="button"
									onClick={() => setShowAddSubtask(false)}
									className={`flex-1 px-6 py-3 rounded-lg font-medium ${
										isDark
											? "bg-gray-800 text-gray-300 hover:bg-gray-700"
											: "bg-gray-100 text-gray-700 hover:bg-gray-200"
									}`}
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div
						className={`w-full max-w-md rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"} p-6`}
					>
						<ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
						<h3
							className={`text-xl font-bold mb-2 text-center ${isDark ? "text-white" : "text-gray-900"}`}
						>
							Delete Task?
						</h3>
						<p
							className={`text-center mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}
						>
							Are you sure you want to delete{" "}
							<strong>"{task.title}"</strong>? This action cannot
							be undone. All subtasks will also be deleted.
						</p>
						<div className="flex items-center gap-3">
							<button
								onClick={handleDeleteTask}
								className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
							>
								Yes, Delete Task
							</button>
							<button
								onClick={() => setShowDeleteConfirm(false)}
								className={`flex-1 px-4 py-3 rounded-lg font-medium ${
									isDark
										? "bg-gray-800 text-gray-300 hover:bg-gray-700"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
								}`}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
