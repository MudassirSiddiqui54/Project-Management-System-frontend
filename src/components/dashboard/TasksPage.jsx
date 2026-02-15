import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { useTheme } from "../ThemeContext.jsx";
import { getProjects, getProjectDetails } from "../../api/project.api.js";
import {
	getProjectTasks,
	createTask,
	updateTask,
	deleteTask,
	updateTaskStatus,
} from "../../api/task.api.js";
import {
	ClipboardDocumentCheckIcon,
	PlusIcon,
	MagnifyingGlassIcon,
	FunnelIcon,
	CalendarDaysIcon,
	UserIcon,
	FlagIcon,
	TagIcon,
	CheckCircleIcon,
	ClockIcon,
	ExclamationCircleIcon,
	EllipsisVerticalIcon,
	PencilIcon,
	TrashIcon,
	ArrowRightIcon,
	XMarkIcon,
	ChevronDownIcon,
} from "@heroicons/react/24/outline";

export default function TasksPage() {
	const { user } = useAuth();
	const { isDark } = useTheme();
	const navigate = useNavigate();
	const [projects, setProjects] = useState([]);
	const [selectedProject, setSelectedProject] = useState("all");
	const [projectMembers, setProjectMembers] = useState([]);
	const [tasks, setTasks] = useState([]);
	const [filteredTasks, setFilteredTasks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadingMembers, setLoadingMembers] = useState(false);

	// Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [priorityFilter, setPriorityFilter] = useState("all");
	const [assignedToFilter, setAssignedToFilter] = useState("all");

	// Task creation/editing
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showTaskDetails, setShowTaskDetails] = useState(null);
	const [newTask, setNewTask] = useState({
		title: "",
		description: "",
		assignedTo: "",
		priority: "medium",
		dueDate: "",
		labels: [],
		projectId: "",
	});
	const [labelInput, setLabelInput] = useState("");

	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	// Fetch projects on mount
	useEffect(() => {
		fetchProjects();
	}, []);

	// Fetch project members when selected project changes
	useEffect(() => {
		if (selectedProject && selectedProject !== "all") {
			fetchProjectMembers(selectedProject);
		} else {
			setProjectMembers([]);
		}
	}, [selectedProject]);

	// Fetch tasks when project changes
	useEffect(() => {
		if (selectedProject !== "all") {
			fetchProjectTasks(selectedProject);
		} else if (projects.length > 0) {
			fetchAllTasks();
		}
	}, [selectedProject, projects]);

	// Apply filters when tasks or filters change
	useEffect(() => {
		applyFilters();
	}, [tasks, searchQuery, statusFilter, priorityFilter, assignedToFilter]);

	const fetchProjects = async () => {
		try {
			const response = await getProjects();
			console.log("Projects API Response:", response);

			const projectsData =
				response.data?.projects ||
				response.data?.data?.projects ||
				response.data ||
				[];

			console.log("Extracted projects:", projectsData);
			setProjects(projectsData);
		} catch (error) {
			console.error("Failed to fetch projects:", error);
			setError("Failed to load projects. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const fetchProjectMembers = async (projectId) => {
		setLoadingMembers(true);
		try {
			const response = await getProjectDetails(projectId);
			console.log("Project Details Response:", response);

			const projectData =
				response.data?.project ||
				response.data?.data?.project ||
				response.data;

			if (projectData) {
				// Get all members including the owner
				const members = [];

				// Add owner
				if (projectData.owner) {
					members.push({
						user: projectData.owner,
						role: "admin",
						isOwner: true,
					});
				}

				// Add other members
				if (projectData.members && Array.isArray(projectData.members)) {
					members.push(...projectData.members);
				}

				console.log("Project members:", members);
				setProjectMembers(members);
			}
		} catch (error) {
			console.error("Failed to fetch project members:", error);
		} finally {
			setLoadingMembers(false);
		}
	};

	const fetchProjectTasks = async (projectId) => {
		setLoading(true);
		try {
			const response = await getProjectTasks(projectId);
			console.log(
				`Tasks API Response for project ${projectId}:`,
				response,
			);

			const tasksData =
				response.data?.tasks ||
				response.data?.data?.tasks ||
				response.data ||
				[];

			console.log("Extracted tasks:", tasksData);

			const tasksWithProject = tasksData.map((task) => ({
				...task,
				title: task.title || "Untitled Task",
				status: task.status || "todo",
				priority: task.priority || "medium",
				description: task.description || "",
				assignedTo: task.assignedTo || null,
				dueDate: task.dueDate || null,
				labels: task.labels || [],
				projectName:
					projects.find((p) => p._id === projectId)?.name ||
					"Unknown Project",
				projectId: projectId,
			}));

			setTasks(tasksWithProject);
		} catch (error) {
			console.error("Failed to fetch tasks:", error);
			setError("Failed to load tasks. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const fetchAllTasks = async () => {
		setLoading(true);
		try {
			const allTasks = [];

			for (const project of projects) {
				try {
					const response = await getProjectTasks(project._id);
					console.log(`Tasks for project ${project._id}:`, response);

					const tasksData =
						response.data?.tasks ||
						response.data?.data?.tasks ||
						response.data ||
						[];

					const tasksWithProject = tasksData.map((task) => ({
						...task,
						title: task.title || "Untitled Task",
						status: task.status || "todo",
						priority: task.priority || "medium",
						description: task.description || "",
						assignedTo: task.assignedTo || null,
						dueDate: task.dueDate || null,
						labels: task.labels || [],
						projectName: project.name,
						projectId: project._id,
					}));

					allTasks.push(...tasksWithProject);
				} catch (error) {
					console.error(
						`Failed to fetch tasks for project ${project._id}:`,
						error,
					);
				}
			}

			console.log("All tasks fetched:", allTasks);
			setTasks(allTasks);
		} catch (error) {
			console.error("Failed to fetch all tasks:", error);
			setError("Failed to load tasks. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const applyFilters = () => {
		let filtered = [...tasks];

		if (searchQuery) {
			filtered = filtered.filter(
				(task) =>
					(task.title || "")
						.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					(task.description || "")
						.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					(task.labels || []).some((label) =>
						(label || "")
							.toLowerCase()
							.includes(searchQuery.toLowerCase()),
					),
			);
		}

		if (statusFilter !== "all") {
			filtered = filtered.filter(
				(task) => (task.status || "todo") === statusFilter,
			);
		}

		if (priorityFilter !== "all") {
			filtered = filtered.filter(
				(task) => (task.priority || "medium") === priorityFilter,
			);
		}

		if (assignedToFilter !== "all") {
			if (assignedToFilter === "me") {
				filtered = filtered.filter(
					(task) =>
						task.assignedTo?._id === user?._id ||
						task.assignedTo === user?._id,
				);
			} else if (assignedToFilter === "unassigned") {
				filtered = filtered.filter((task) => !task.assignedTo);
			} else {
				filtered = filtered.filter(
					(task) =>
						task.assignedTo?._id === assignedToFilter ||
						task.assignedTo === assignedToFilter,
				);
			}
		}

		setFilteredTasks(filtered);
	};

	const handleCreateTask = async (e) => {
		e.preventDefault();

		if (!newTask.title.trim()) {
			setError("Please enter a task title");
			return;
		}

		const projectId =
			selectedProject === "all" ? newTask.projectId : selectedProject;

		if (!projectId) {
			setError("Please select a project");
			return;
		}

		try {
			const taskData = {
				title: newTask.title.trim(),
				description: newTask.description?.trim() || "",
				assignedTo: newTask.assignedTo || null,
				priority: newTask.priority,
				dueDate: newTask.dueDate || null,
				labels: newTask.labels,
			};

			console.log("Creating task with data:", taskData);
			const response = await createTask(projectId, taskData);
			console.log("Create task response:", response);

			const createdTask =
				response.data?.task ||
				response.data?.data?.task ||
				response.data;

			const taskWithDefaults = {
				...createdTask,
				title: createdTask?.title || newTask.title,
				status: createdTask?.status || "todo",
				priority: createdTask?.priority || newTask.priority,
				description: createdTask?.description || newTask.description,
				assignedTo: createdTask?.assignedTo || null,
				dueDate: createdTask?.dueDate || null,
				labels: createdTask?.labels || newTask.labels,
				projectName: projects.find((p) => p._id === projectId)?.name,
				projectId: projectId,
			};

			setTasks((prev) => [taskWithDefaults, ...prev]);
			setNewTask({
				title: "",
				description: "",
				assignedTo: "",
				priority: "medium",
				dueDate: "",
				labels: [],
				projectId: "",
			});
			setShowCreateModal(false);
			setSuccess("Task created successfully!");
			setTimeout(() => setSuccess(""), 3000);
		} catch (error) {
			console.error("Failed to create task:", error);
			setError(
				error.response?.data?.message ||
					"Failed to create task. Please try again.",
			);
		}
	};

	const handleUpdateTaskStatus = async (taskId, newStatus, projectId) => {
		try {
			await updateTaskStatus(
				projectId || selectedProject,
				taskId,
				newStatus,
			);

			setTasks((prev) =>
				prev.map((task) => {
					if (task._id === taskId) {
						return { ...task, status: newStatus };
					}
					return task;
				}),
			);

			setSuccess("Task status updated!");
			setTimeout(() => setSuccess(""), 3000);
		} catch (error) {
			console.error("Failed to update task status:", error);
			setError("Failed to update task status. Please try again.");
		}
	};

	const handleDeleteTask = async (taskId, projectId) => {
		if (!window.confirm("Are you sure you want to delete this task?")) {
			return;
		}

		try {
			await deleteTask(projectId || selectedProject, taskId);

			setTasks((prev) => prev.filter((task) => task._id !== taskId));

			setSuccess("Task deleted successfully!");
			setTimeout(() => setSuccess(""), 3000);
		} catch (error) {
			console.error("Failed to delete task:", error);
			setError("Failed to delete task. Please try again.");
		}
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
		if (!dateString) return "No due date";
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = date - now;
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return "Today";
		if (diffDays === 1) return "Tomorrow";
		if (diffDays === -1) return "Yesterday";
		if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
		if (diffDays < 7) return `In ${diffDays} days`;

		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	};

	const addLabel = () => {
		if (labelInput.trim() && !newTask.labels.includes(labelInput.trim())) {
			setNewTask((prev) => ({
				...prev,
				labels: [...prev.labels, labelInput.trim()],
			}));
			setLabelInput("");
		}
	};

	const removeLabel = (labelToRemove) => {
		setNewTask((prev) => ({
			...prev,
			labels: prev.labels.filter((label) => label !== labelToRemove),
		}));
	};

	// Get all unique assignees from tasks
	const getAssignees = () => {
		const assignees = new Map();

		tasks.forEach((task) => {
			if (task.assignedTo) {
				const assigneeId = task.assignedTo._id || task.assignedTo;
				const assigneeName = task.assignedTo.username || "Unknown";
				const assigneeEmail = task.assignedTo.email;

				if (assigneeId && !assignees.has(assigneeId)) {
					assignees.set(assigneeId, {
						id: assigneeId,
						name: assigneeName,
						email: assigneeEmail,
					});
				}
			}
		});

		return Array.from(assignees.values());
	};

	// Get current project members for the selected project
	const getCurrentProjectMembers = () => {
		if (selectedProject === "all") {
			// If "All Projects", we can't show project-specific members
			// Instead, show all unique assignees from tasks
			return getAssignees();
		}
		return projectMembers;
	};

	if (loading && tasks.length === 0 && projects.length === 0) {
		return (
			<div
				className={`min-h-screen flex items-center justify-center ${
					isDark ? "bg-gray-950" : "bg-gray-50"
				}`}
			>
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto mb-4"></div>
					<p className={isDark ? "text-gray-400" : "text-gray-600"}>
						Loading tasks...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`min-h-screen ${isDark ? "bg-gray-950" : "bg-gray-50"}`}
		>
			<div className="p-4 md:p-8">
				{/* Header */}
				<div className="mb-8">
					<h1
						className={`text-3xl font-bold mb-2 ${
							isDark ? "text-white" : "text-gray-900"
						}`}
					>
						Tasks
					</h1>
					<p className={isDark ? "text-gray-400" : "text-gray-600"}>
						Manage and track all your tasks across projects
					</p>
				</div>

				{/* Stats Bar */}
				<div
					className={`rounded-2xl border ${
						isDark
							? "bg-gray-900/50 border-gray-800"
							: "bg-white border-gray-200"
					} p-6 mb-6`}
				>
					<div className="grid grid-cols-1 md:grid-cols-5 gap-6">
						<div>
							<div className="flex items-center gap-3">
								<div
									className={`p-3 rounded-lg ${
										isDark ? "bg-gray-800" : "bg-gray-100"
									}`}
								>
									<ClipboardDocumentCheckIcon className="h-6 w-6 text-lime-500" />
								</div>
								<div>
									<p
										className={`text-2xl font-bold ${
											isDark
												? "text-white"
												: "text-gray-900"
										}`}
									>
										{tasks.length}
									</p>
									<p
										className={`text-sm ${
											isDark
												? "text-gray-400"
												: "text-gray-600"
										}`}
									>
										Total Tasks
									</p>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-3">
								<div
									className={`p-3 rounded-lg ${
										isDark
											? "bg-blue-900/30"
											: "bg-blue-100"
									}`}
								>
									<ClockIcon className="h-6 w-6 text-blue-500" />
								</div>
								<div>
									<p
										className={`text-2xl font-bold ${
											isDark
												? "text-white"
												: "text-gray-900"
										}`}
									>
										{
											tasks.filter(
												(t) =>
													(t.status || "todo") ===
													"in-progress",
											).length
										}
									</p>
									<p
										className={`text-sm ${
											isDark
												? "text-gray-400"
												: "text-gray-600"
										}`}
									>
										In Progress
									</p>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-3">
								<div
									className={`p-3 rounded-lg ${
										isDark
											? "bg-green-900/30"
											: "bg-green-100"
									}`}
								>
									<CheckCircleIcon className="h-6 w-6 text-green-500" />
								</div>
								<div>
									<p
										className={`text-2xl font-bold ${
											isDark
												? "text-white"
												: "text-gray-900"
										}`}
									>
										{
											tasks.filter(
												(t) =>
													(t.status || "todo") ===
													"done",
											).length
										}
									</p>
									<p
										className={`text-sm ${
											isDark
												? "text-gray-400"
												: "text-gray-600"
										}`}
									>
										Completed
									</p>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-3">
								<div
									className={`p-3 rounded-lg ${
										isDark ? "bg-red-900/30" : "bg-red-100"
									}`}
								>
									<ExclamationCircleIcon className="h-6 w-6 text-red-500" />
								</div>
								<div>
									<p
										className={`text-2xl font-bold ${
											isDark
												? "text-white"
												: "text-gray-900"
										}`}
									>
										{
											tasks.filter(
												(t) =>
													(t.priority || "medium") ===
														"high" ||
													(t.priority || "medium") ===
														"critical",
											).length
										}
									</p>
									<p
										className={`text-sm ${
											isDark
												? "text-gray-400"
												: "text-gray-600"
										}`}
									>
										High Priority
									</p>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-3">
								<div
									className={`p-3 rounded-lg ${
										isDark
											? "bg-yellow-900/30"
											: "bg-yellow-100"
									}`}
								>
									<CalendarDaysIcon className="h-6 w-6 text-yellow-500" />
								</div>
								<div>
									<p
										className={`text-2xl font-bold ${
											isDark
												? "text-white"
												: "text-gray-900"
										}`}
									>
										{
											tasks.filter(
												(t) =>
													t.dueDate &&
													new Date(t.dueDate) <
														new Date(),
											).length
										}
									</p>
									<p
										className={`text-sm ${
											isDark
												? "text-gray-400"
												: "text-gray-600"
										}`}
									>
										Overdue
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Action Bar */}
				<div
					className={`rounded-2xl border ${
						isDark
							? "bg-gray-900/50 border-gray-800"
							: "bg-white border-gray-200"
					} p-6 mb-6`}
				>
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						{/* Project Selector */}
						<div className="relative flex-1">
							<select
								value={selectedProject}
								onChange={(e) =>
									setSelectedProject(e.target.value)
								}
								className={`w-full px-4 py-2 rounded-lg border ${
									isDark
										? "border-gray-700 bg-gray-800 text-white"
										: "border-gray-300 bg-white text-gray-900"
								}`}
							>
								<option value="all">All Projects</option>
								{projects.map((project) => (
									<option
										key={project._id}
										value={project._id}
									>
										{project.name}
									</option>
								))}
							</select>
						</div>

						{/* Search Bar */}
						<div className="relative flex-1">
							<div className="absolute left-3 top-1/2 transform -translate-y-1/2">
								<MagnifyingGlassIcon
									className={`h-5 w-5 ${
										isDark
											? "text-gray-500"
											: "text-gray-400"
									}`}
								/>
							</div>
							<input
								type="text"
								placeholder="Search tasks..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
									isDark
										? "border-gray-700 bg-gray-800 text-white focus:border-lime-500"
										: "border-gray-300 bg-white text-gray-900 focus:border-lime-500"
								} focus:ring-2 focus:ring-lime-500/20 focus:outline-none`}
							/>
						</div>

						{/* Filters */}
						<div className="flex items-center gap-3">
							{/* Status Filter */}
							<div className="relative">
								<select
									value={statusFilter}
									onChange={(e) =>
										setStatusFilter(e.target.value)
									}
									className={`px-4 py-2 rounded-lg border appearance-none pr-8 ${
										isDark
											? "border-gray-700 bg-gray-800 text-white"
											: "border-gray-300 bg-white text-gray-900"
									}`}
								>
									<option value="all">All Status</option>
									<option value="todo">To Do</option>
									<option value="in-progress">
										In Progress
									</option>
									<option value="review">Review</option>
									<option value="done">Done</option>
									<option value="blocked">Blocked</option>
								</select>
								<FunnelIcon
									className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
										isDark
											? "text-gray-400"
											: "text-gray-500"
									}`}
								/>
							</div>

							{/* Priority Filter */}
							<div className="relative">
								<select
									value={priorityFilter}
									onChange={(e) =>
										setPriorityFilter(e.target.value)
									}
									className={`px-4 py-2 rounded-lg border appearance-none pr-8 ${
										isDark
											? "border-gray-700 bg-gray-800 text-white"
											: "border-gray-300 bg-white text-gray-900"
									}`}
								>
									<option value="all">All Priority</option>
									<option value="low">Low</option>
									<option value="medium">Medium</option>
									<option value="high">High</option>
									<option value="critical">Critical</option>
								</select>
								<FlagIcon
									className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
										isDark
											? "text-gray-400"
											: "text-gray-500"
									}`}
								/>
							</div>

							{/* Create Button */}
							<button
								onClick={() => setShowCreateModal(true)}
								className="px-4 py-2 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-lg font-medium hover:from-lime-600 hover:to-lime-700 flex items-center gap-2"
							>
								<PlusIcon className="h-4 w-4" />
								<span>New Task</span>
							</button>
						</div>
					</div>

					{/* Additional Filters Row */}
					<div className="flex items-center gap-3 mt-4">
						{/* Assigned To Filter */}
						<div className="relative">
							<select
								value={assignedToFilter}
								onChange={(e) =>
									setAssignedToFilter(e.target.value)
								}
								className={`px-4 py-2 rounded-lg border appearance-none pr-8 ${
									isDark
										? "border-gray-700 bg-gray-800 text-white"
										: "border-gray-300 bg-white text-gray-900"
								}`}
							>
								<option value="all">Assigned to Anyone</option>
								<option value="me">Assigned to Me</option>
								<option value="unassigned">Unassigned</option>
								{selectedProject === "all"
									? // Show assignees from all tasks when "All Projects" is selected
										getAssignees().map((assignee) => (
											<option
												key={assignee.id}
												value={assignee.id}
											>
												{assignee.name}
											</option>
										))
									: // Show project members when a specific project is selected
										projectMembers.map((member) => {
											const user = member.user || member;
											return (
												<option
													key={user._id}
													value={user._id}
												>
													{user.username ||
														user.name ||
														user.email}{" "}
													{member.isOwner
														? "(Owner)"
														: ""}
												</option>
											);
										})}
							</select>
							<UserIcon
								className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
									isDark ? "text-gray-400" : "text-gray-500"
								}`}
							/>
						</div>
					</div>
				</div>

				{/* Success/Error Messages */}
				{success && (
					<div
						className={`mb-6 p-4 rounded-lg ${
							isDark
								? "bg-green-900/30 border border-green-800"
								: "bg-green-50 border border-green-200"
						}`}
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
						className={`mb-6 p-4 rounded-lg ${
							isDark
								? "bg-red-900/30 border border-red-800"
								: "bg-red-50 border border-red-200"
						}`}
					>
						<div className="flex items-center justify-between">
							<p className="text-red-500">{error}</p>
							<button onClick={() => setError("")}>
								<XMarkIcon className="h-4 w-4 text-red-500" />
							</button>
						</div>
					</div>
				)}

				{/* Tasks Grid/List */}
				{filteredTasks.length === 0 ? (
					<div
						className={`rounded-2xl border ${
							isDark
								? "bg-gray-900/50 border-gray-800"
								: "bg-white border-gray-200"
						} p-12 text-center`}
					>
						<ClipboardDocumentCheckIcon
							className={`h-16 w-16 mx-auto mb-4 ${
								isDark ? "text-gray-700" : "text-gray-300"
							}`}
						/>
						<h3
							className={`text-xl font-bold mb-2 ${
								isDark ? "text-gray-300" : "text-gray-700"
							}`}
						>
							{searchQuery ||
							statusFilter !== "all" ||
							priorityFilter !== "all" ||
							assignedToFilter !== "all"
								? "No matching tasks found"
								: "No tasks yet"}
						</h3>
						<p
							className={`mb-6 ${
								isDark ? "text-gray-500" : "text-gray-500"
							}`}
						>
							{searchQuery ||
							statusFilter !== "all" ||
							priorityFilter !== "all" ||
							assignedToFilter !== "all"
								? "Try adjusting your filters"
								: selectedProject === "all"
									? "Select a project or create your first task"
									: "Create your first task for this project"}
						</p>
						<button
							onClick={() => setShowCreateModal(true)}
							className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-lg font-medium hover:from-lime-600 hover:to-lime-700"
						>
							<PlusIcon className="h-4 w-4" />
							Create Task
						</button>
					</div>
				) : (
					<div className="space-y-4">
						{filteredTasks.map((task) => {
							const safeStatus = task.status || "todo";
							const safePriority = task.priority || "medium";

							return (
								<div
									key={task._id}
									className={`rounded-2xl border ${
										isDark
											? "bg-gray-900/50 border-gray-800 hover:border-lime-500/30"
											: "bg-white border-gray-200 hover:border-lime-500/50"
									} p-6 transition`}
								>
									<div className="flex items-start justify-between">
										{/* Task Info */}
										<div className="flex-1">
											<div className="flex items-start gap-4">
												{/* Status Checkbox */}
												<button
													onClick={() =>
														handleUpdateTaskStatus(
															task._id,
															safeStatus ===
																"done"
																? "todo"
																: "done",
															task.projectId,
														)
													}
													className={`mt-1 h-6 w-6 rounded-full border-2 flex items-center justify-center ${
														safeStatus === "done"
															? "bg-green-500 border-green-500"
															: isDark
																? "border-gray-600"
																: "border-gray-300"
													}`}
												>
													{safeStatus === "done" && (
														<CheckCircleIcon className="h-4 w-4 text-white" />
													)}
												</button>

												{/* Task Details */}
												<div className="flex-1">
													<div className="flex items-center gap-3 mb-2">
														<h3
															className={`font-bold ${
																isDark
																	? "text-white"
																	: "text-gray-900"
															}`}
														>
															{task.title}
														</h3>
														<div className="flex items-center gap-2">
															<span
																className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(
																	safeStatus,
																)}`}
															>
																{safeStatus
																	.replace(
																		"-",
																		" ",
																	)
																	.toUpperCase()}
															</span>
															<span
																className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(
																	safePriority,
																)} flex items-center gap-1`}
															>
																{getPriorityIcon(
																	safePriority,
																)}
																{safePriority.toUpperCase()}
															</span>
														</div>
													</div>

													<p
														className={`mb-4 ${
															isDark
																? "text-gray-400"
																: "text-gray-600"
														}`}
													>
														{task.description ||
															"No description provided"}
													</p>

													{/* Task Meta */}
													<div className="flex flex-wrap items-center gap-4">
														{selectedProject ===
															"all" &&
															task.projectName && (
																<span
																	className={`text-sm flex items-center gap-1 ${
																		isDark
																			? "text-gray-400"
																			: "text-gray-600"
																	}`}
																>
																	<svg
																		className="h-4 w-4"
																		fill="none"
																		viewBox="0 0 24 24"
																		stroke="currentColor"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={
																				2
																			}
																			d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
																		/>
																	</svg>
																	{
																		task.projectName
																	}
																</span>
															)}

														{task.assignedTo && (
															<span
																className={`text-sm flex items-center gap-1 ${
																	isDark
																		? "text-gray-400"
																		: "text-gray-600"
																}`}
															>
																<UserIcon className="h-4 w-4" />
																{task.assignedTo
																	.username ||
																	"Assigned"}
															</span>
														)}

														{task.dueDate && (
															<span
																className={`text-sm flex items-center gap-1 ${
																	isDark
																		? "text-gray-400"
																		: "text-gray-600"
																}`}
															>
																<CalendarDaysIcon className="h-4 w-4" />
																{formatDate(
																	task.dueDate,
																)}
															</span>
														)}

														{task.labels &&
															task.labels.length >
																0 && (
																<div className="flex items-center gap-1">
																	<TagIcon
																		className={`h-4 w-4 ${
																			isDark
																				? "text-gray-500"
																				: "text-gray-400"
																		}`}
																	/>
																	{task.labels
																		.slice(
																			0,
																			2,
																		)
																		.map(
																			(
																				label,
																				index,
																			) => (
																				<span
																					key={
																						index
																					}
																					className={`text-xs px-2 py-1 rounded-full ${
																						isDark
																							? "bg-gray-800 text-gray-300"
																							: "bg-gray-100 text-gray-700"
																					}`}
																				>
																					{
																						label
																					}
																				</span>
																			),
																		)}
																	{task.labels
																		.length >
																		2 && (
																		<span
																			className={`text-xs ${
																				isDark
																					? "text-gray-500"
																					: "text-gray-500"
																			}`}
																		>
																			+
																			{task
																				.labels
																				.length -
																				2}{" "}
																			more
																		</span>
																	)}
																</div>
															)}
													</div>
												</div>
											</div>
										</div>

										{/* Actions */}
										<div className="flex items-center gap-2 ml-4">
											<button
												onClick={() =>
													setShowTaskDetails(
														showTaskDetails ===
															task._id
															? null
															: task._id,
													)
												}
												className={`p-2 rounded-lg ${
													isDark
														? "hover:bg-gray-800 text-gray-400"
														: "hover:bg-gray-100 text-gray-600"
												}`}
											>
												<EllipsisVerticalIcon className="h-5 w-5" />
											</button>

											{showTaskDetails === task._id && (
												<div
													className={`absolute right-8 mt-2 w-48 rounded-lg shadow-lg z-10 ${
														isDark
															? "bg-gray-800 border border-gray-700"
															: "bg-white border border-gray-200"
													}`}
												>
													<Link
														to={`/dashboard/projects/${
															task.projectId ||
															selectedProject
														}/tasks/${task._id}`}
														className={`flex items-center gap-2 w-full px-4 py-3 text-left ${
															isDark
																? "hover:bg-gray-700 text-gray-300"
																: "hover:bg-gray-50 text-gray-700"
														}`}
													>
														<ArrowRightIcon className="h-4 w-4" />
														View Details
													</Link>
													<button
														onClick={() => {
															/* Edit task */
														}}
														className={`flex items-center gap-2 w-full px-4 py-3 text-left ${
															isDark
																? "hover:bg-gray-700 text-gray-300"
																: "hover:bg-gray-50 text-gray-700"
														}`}
													>
														<PencilIcon className="h-4 w-4" />
														Edit Task
													</button>
													<button
														onClick={() =>
															handleDeleteTask(
																task._id,
																task.projectId,
															)
														}
														className={`flex items-center gap-2 w-full px-4 py-3 text-left ${
															isDark
																? "hover:bg-red-900/30 text-red-400"
																: "hover:bg-red-50 text-red-600"
														}`}
													>
														<TrashIcon className="h-4 w-4" />
														Delete Task
													</button>
												</div>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Pagination/Info */}
				<div className="mt-6 flex items-center justify-between">
					<p className={isDark ? "text-gray-400" : "text-gray-600"}>
						Showing {filteredTasks.length} of {tasks.length} tasks
					</p>
					<div className="flex items-center gap-2">
						<button
							className={`px-3 py-1 rounded ${
								isDark
									? "hover:bg-gray-800 text-gray-300"
									: "hover:bg-gray-100 text-gray-600"
							}`}
							disabled
						>
							Previous
						</button>
						<span
							className={
								isDark ? "text-gray-400" : "text-gray-600"
							}
						>
							Page 1
						</span>
						<button
							className={`px-3 py-1 rounded ${
								isDark
									? "hover:bg-gray-800 text-gray-300"
									: "hover:bg-gray-100 text-gray-600"
							}`}
							disabled
						>
							Next
						</button>
					</div>
				</div>
			</div>

			{/* Create Task Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div
						className={`w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto ${
							isDark ? "bg-gray-900" : "bg-white"
						} p-6`}
					>
						<div className="flex items-center justify-between mb-6">
							<h3
								className={`text-xl font-bold ${
									isDark ? "text-white" : "text-gray-900"
								}`}
							>
								<PlusIcon className="h-5 w-5 inline mr-2" />
								Create New Task
							</h3>
							<button
								onClick={() => setShowCreateModal(false)}
								className={`p-2 rounded-lg ${
									isDark
										? "hover:bg-gray-800 text-gray-400"
										: "hover:bg-gray-100 text-gray-600"
								}`}
							>
								<XMarkIcon className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={handleCreateTask}>
							<div className="space-y-6">
								{/* Project Selection (if viewing all projects) */}
								{selectedProject === "all" && (
									<div>
										<label
											className={`block text-sm font-medium mb-2 ${
												isDark
													? "text-gray-300"
													: "text-gray-700"
											}`}
										>
											Project *
										</label>
										<select
											value={newTask.projectId || ""}
											onChange={(e) =>
												setNewTask({
													...newTask,
													projectId: e.target.value,
												})
											}
											className={`w-full px-4 py-3 rounded-lg border ${
												isDark
													? "border-gray-700 bg-gray-800 text-white"
													: "border-gray-300 bg-white text-gray-900"
											}`}
											required
										>
											<option value="">
												Select a project
											</option>
											{projects.map((project) => (
												<option
													key={project._id}
													value={project._id}
												>
													{project.name}
												</option>
											))}
										</select>
									</div>
								)}

								<div className="grid md:grid-cols-2 gap-6">
									{/* Task Title */}
									<div className="md:col-span-2">
										<label
											className={`block text-sm font-medium mb-2 ${
												isDark
													? "text-gray-300"
													: "text-gray-700"
											}`}
										>
											Task Title *
										</label>
										<input
											type="text"
											value={newTask.title}
											onChange={(e) =>
												setNewTask({
													...newTask,
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

									{/* Description */}
									<div className="md:col-span-2">
										<label
											className={`block text-sm font-medium mb-2 ${
												isDark
													? "text-gray-300"
													: "text-gray-700"
											}`}
										>
											Description
										</label>
										<textarea
											value={newTask.description}
											onChange={(e) =>
												setNewTask({
													...newTask,
													description: e.target.value,
												})
											}
											placeholder="Add details, instructions, or context..."
											rows="3"
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
											className={`block text-sm font-medium mb-2 ${
												isDark
													? "text-gray-300"
													: "text-gray-700"
											}`}
										>
											Assign To
										</label>
										<select
											value={newTask.assignedTo}
											onChange={(e) =>
												setNewTask({
													...newTask,
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
											{/* Show project members based on selected project */}
											{selectedProject === "all"
												? // If "All Projects", show members from all projects (through tasks)
													getAssignees().map(
														(assignee) => (
															<option
																key={
																	assignee.id
																}
																value={
																	assignee.id
																}
															>
																{assignee.name}
															</option>
														),
													)
												: // If specific project selected, show its members
													projectMembers.map(
														(member) => {
															const user =
																member.user ||
																member;
															return (
																<option
																	key={
																		user._id
																	}
																	value={
																		user._id
																	}
																>
																	{user.username ||
																		user.name ||
																		user.email}{" "}
																	{member.isOwner
																		? "(Owner)"
																		: ""}
																</option>
															);
														},
													)}
										</select>
									</div>

									{/* Priority */}
									<div>
										<label
											className={`block text-sm font-medium mb-2 ${
												isDark
													? "text-gray-300"
													: "text-gray-700"
											}`}
										>
											Priority
										</label>
										<select
											value={newTask.priority}
											onChange={(e) =>
												setNewTask({
													...newTask,
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
											className={`block text-sm font-medium mb-2 ${
												isDark
													? "text-gray-300"
													: "text-gray-700"
											}`}
										>
											Due Date
										</label>
										<input
											type="date"
											value={newTask.dueDate}
											onChange={(e) =>
												setNewTask({
													...newTask,
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

									{/* Labels */}
									<div>
										<label
											className={`block text-sm font-medium mb-2 ${
												isDark
													? "text-gray-300"
													: "text-gray-700"
											}`}
										>
											Labels
										</label>
										<div className="flex gap-2 mb-2">
											<input
												type="text"
												value={labelInput}
												onChange={(e) =>
													setLabelInput(
														e.target.value,
													)
												}
												onKeyPress={(e) =>
													e.key === "Enter" &&
													(e.preventDefault(),
													addLabel())
												}
												placeholder="Add a label and press Enter"
												className={`flex-1 px-4 py-2 rounded-lg border ${
													isDark
														? "border-gray-700 bg-gray-800 text-white"
														: "border-gray-300 bg-white text-gray-900"
												}`}
											/>
											<button
												type="button"
												onClick={addLabel}
												className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
											>
												Add
											</button>
										</div>
										<div className="flex flex-wrap gap-2">
											{newTask.labels.map(
												(label, index) => (
													<span
														key={index}
														className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
															isDark
																? "bg-gray-800 text-gray-300"
																: "bg-gray-100 text-gray-700"
														}`}
													>
														{label}
														<button
															type="button"
															onClick={() =>
																removeLabel(
																	label,
																)
															}
															className="ml-1 hover:text-red-500"
														>
															<XMarkIcon className="h-3 w-3" />
														</button>
													</span>
												),
											)}
										</div>
									</div>
								</div>
							</div>

							<div className="flex items-center gap-3 mt-6">
								<button
									type="submit"
									className="flex-1 px-6 py-3 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-lg font-medium hover:from-lime-600 hover:to-lime-700"
								>
									Create Task
								</button>
								<button
									type="button"
									onClick={() => setShowCreateModal(false)}
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
		</div>
	);
}
