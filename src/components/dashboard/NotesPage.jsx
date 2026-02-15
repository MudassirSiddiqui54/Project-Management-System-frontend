import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { useTheme } from "../ThemeContext.jsx";
import { getProjects } from "../../api/project.api.js";
import {
	getProjectNotes,
	createNote,
	updateNote,
	deleteNote,
} from "../../api/note.api.js";
import {
	DocumentTextIcon,
	PlusIcon,
	MagnifyingGlassIcon,
	FunnelIcon,
	TagIcon,
	PencilIcon,
	TrashIcon,
	EllipsisVerticalIcon,
	UserIcon,
	CalendarDaysIcon,
	XMarkIcon,
	ClockIcon,
	MapPinIcon,
} from "@heroicons/react/24/outline";

export default function NotesPage() {
	const { user } = useAuth();
	const { isDark } = useTheme();
	const navigate = useNavigate();
	const [projects, setProjects] = useState([]);
	const [selectedProject, setSelectedProject] = useState("all");
	const [notes, setNotes] = useState([]);
	const [filteredNotes, setFilteredNotes] = useState([]);
	const [loading, setLoading] = useState(true);

	// Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [tagFilter, setTagFilter] = useState("all");
	const [showPinnedOnly, setShowPinnedOnly] = useState(false);
	const [sortBy, setSortBy] = useState("pinned");

	// Note creation/editing
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [editingNote, setEditingNote] = useState(null);
	const [showNoteMenu, setShowNoteMenu] = useState(null);
	const [newNote, setNewNote] = useState({
		title: "",
		content: "",
		tags: [],
		isPinned: false,
	});
	const [tagInput, setTagInput] = useState("");

	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	useEffect(() => {
		fetchProjects();
	}, []);

	useEffect(() => {
		if (selectedProject !== "all") {
			fetchProjectNotes(selectedProject);
		} else if (projects.length > 0) {
			fetchAllNotes();
		}
	}, [selectedProject, projects]);

	useEffect(() => {
		applyFilters();
	}, [notes, searchQuery, tagFilter, showPinnedOnly, sortBy]);

	const fetchProjects = async () => {
		try {
			const response = await getProjects();
			const projectsData =
				response.data?.data?.projects || response.data?.projects || [];
			setProjects(projectsData);
		} catch (error) {
			console.error("Failed to fetch projects:", error);
			setError("Failed to load projects. Please try again.");
		}
	};

	const fetchProjectNotes = async (projectId) => {
		setLoading(true);
		try {
			const response = await getProjectNotes(projectId);
			const notesData = response.data?.data?.notes || [];

			const notesWithProject = notesData.map((note) => ({
				...note,
				projectName: projects.find((p) => p._id === projectId)?.name,
				projectId: projectId,
			}));

			setNotes(notesWithProject);
		} catch (error) {
			console.error("Failed to fetch notes:", error);
			setError("Failed to load notes. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const fetchAllNotes = async () => {
		setLoading(true);
		try {
			const allNotes = [];

			for (const project of projects) {
				try {
					const response = await getProjectNotes(project._id);
					const projectNotes = response.data?.data?.notes || [];

					const notesWithProject = projectNotes.map((note) => ({
						...note,
						projectName: project.name,
						projectId: project._id,
					}));

					allNotes.push(...notesWithProject);
				} catch (error) {
					console.error(
						`Failed to fetch notes for project ${project._id}:`,
						error,
					);
				}
			}

			setNotes(allNotes);
		} catch (error) {
			console.error("Failed to fetch all notes:", error);
			setError("Failed to load notes. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const applyFilters = () => {
		let filtered = [...notes];

		if (showPinnedOnly) {
			filtered = filtered.filter((note) => note.isPinned);
		}

		if (searchQuery) {
			filtered = filtered.filter(
				(note) =>
					(note.title || "")
						.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					(note.content || "")
						.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					(note.tags || []).some((tag) =>
						(tag || "")
							.toLowerCase()
							.includes(searchQuery.toLowerCase()),
					),
			);
		}

		if (tagFilter !== "all") {
			filtered = filtered.filter((note) =>
				(note.tags || []).includes(tagFilter),
			);
		}

		// Sort notes (pinned first always)
		filtered.sort((a, b) => {
			if (a.isPinned && !b.isPinned) return -1;
			if (!a.isPinned && b.isPinned) return 1;

			switch (sortBy) {
				case "newest":
					return (
						new Date(b.updatedAt || b.createdAt) -
						new Date(a.updatedAt || a.createdAt)
					);
				case "oldest":
					return (
						new Date(a.updatedAt || a.createdAt) -
						new Date(b.updatedAt || b.createdAt)
					);
				case "title_asc":
					return (a.title || "").localeCompare(b.title || "");
				case "title_desc":
					return (b.title || "").localeCompare(a.title || "");
				case "pinned":
				default:
					return (
						new Date(b.updatedAt || b.createdAt) -
						new Date(a.updatedAt || a.createdAt)
					);
			}
		});

		setFilteredNotes(filtered);
	};

	const handleCreateNote = async (e) => {
		e.preventDefault();

		if (!newNote.title.trim()) {
			setError("Please enter a note title");
			return;
		}

		if (!newNote.content.trim()) {
			setError("Note content is required");
			return;
		}

		const projectId =
			selectedProject === "all" ? newNote.projectId : selectedProject;

		if (!projectId) {
			setError("Please select a project");
			return;
		}

		// Check pin limit (max 3 pinned notes per project)
		if (newNote.isPinned) {
			const pinnedCount = notes.filter(
				(n) => n.isPinned && n.projectId === projectId,
			).length;

			if (pinnedCount >= 3) {
				setError("You can only pin up to 3 notes per project");
				return;
			}
		}

		try {
			const noteData = {
				title: newNote.title.trim(),
				content: newNote.content.trim(),
				tags: newNote.tags,
				isPinned: newNote.isPinned,
			};

			const response = await createNote(projectId, noteData);
			const createdNote = response.data?.data?.note;

			if (!createdNote) {
				throw new Error("No note data returned");
			}

			const noteWithProject = {
				...createdNote,
				projectName: projects.find((p) => p._id === projectId)?.name,
				projectId: projectId,
			};

			setNotes((prev) => [noteWithProject, ...prev]);
			setNewNote({
				title: "",
				content: "",
				tags: [],
				isPinned: false,
				projectId: "",
			});
			setTagInput("");
			setShowCreateModal(false);
			setSuccess("Note created successfully!");
			setTimeout(() => setSuccess(""), 3000);
		} catch (error) {
			console.error("Failed to create note:", error);
			setError(
				error.response?.data?.message ||
					"Failed to create note. Please try again.",
			);
		}
	};

	const handleUpdateNote = async (noteId, updates) => {
		const note = notes.find((n) => n._id === noteId);
		if (!note) return;

		if (updates.isPinned && !note.isPinned) {
			const pinnedCount = notes.filter(
				(n) => n.isPinned && n.projectId === note.projectId,
			).length;

			if (pinnedCount >= 3) {
				setError("You can only pin up to 3 notes per project");
				return;
			}
		}

		try {
			const response = await updateNote(note.projectId, noteId, updates);
			const updatedNote = response.data?.data?.note;

			setNotes((prev) =>
				prev.map((n) => {
					if (n._id === noteId) {
						return {
							...n,
							...updatedNote,
							updatedAt: new Date().toISOString(),
						};
					}
					return n;
				}),
			);

			setShowNoteMenu(null);
			setEditingNote(null);
			setSuccess(`Note ${updates.isPinned ? "pinned" : "unpinned"}!`);
			setTimeout(() => setSuccess(""), 3000);
		} catch (error) {
			console.error("Failed to update note:", error);
			setError(
				error.response?.data?.message ||
					"Failed to update note. Please try again.",
			);
		}
	};

	const handleDeleteNote = async (noteId, projectId) => {
		if (!window.confirm("Are you sure you want to delete this note?")) {
			return;
		}

		try {
			await deleteNote(projectId, noteId);

			setNotes((prev) => prev.filter((note) => note._id !== noteId));
			setShowNoteMenu(null);
			setSuccess("Note deleted successfully!");
			setTimeout(() => setSuccess(""), 3000);
		} catch (error) {
			console.error("Failed to delete note:", error);
			setError(
				error.response?.data?.message ||
					"Failed to delete note. Please try again.",
			);
		}
	};

	const getAllTags = () => {
		const tags = new Set();

		notes.forEach((note) => {
			(note.tags || []).forEach((tag) => {
				if (tag && tag.trim()) tags.add(tag);
			});
		});

		return Array.from(tags).sort();
	};

	const addTag = () => {
		if (tagInput.trim() && !newNote.tags.includes(tagInput.trim())) {
			setNewNote((prev) => ({
				...prev,
				tags: [...prev.tags, tagInput.trim()],
			}));
			setTagInput("");
		}
	};

	const removeTag = (tagToRemove) => {
		setNewNote((prev) => ({
			...prev,
			tags: prev.tags.filter((tag) => tag !== tagToRemove),
		}));
	};

	const formatDate = (dateString) => {
		if (!dateString) return "N/A";
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = now - date;
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return "Today";
		} else if (diffDays === 1) {
			return "Yesterday";
		} else if (diffDays < 7) {
			return `${diffDays} days ago`;
		} else if (diffDays < 30) {
			const weeks = Math.floor(diffDays / 7);
			return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
		}

		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	// Render markdown content with proper dark mode colors
	const renderContent = (content) => {
		if (!content) return null;

		const lines = content.split("\n");
		return lines.map((line, i) => {
			// Headers
			if (line.startsWith("# ")) {
				return (
					<h1
						key={i}
						className={`text-2xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}
					>
						{line.substring(2)}
					</h1>
				);
			} else if (line.startsWith("## ")) {
				return (
					<h2
						key={i}
						className={`text-xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-gray-800"}`}
					>
						{line.substring(3)}
					</h2>
				);
			} else if (line.startsWith("### ")) {
				return (
					<h3
						key={i}
						className={`text-lg font-bold mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}
					>
						{line.substring(4)}
					</h3>
				);
			}
			// Lists
			else if (line.startsWith("- ") || line.startsWith("* ")) {
				return (
					<li
						key={i}
						className={`ml-6 list-disc ${isDark ? "text-gray-300" : "text-gray-700"}`}
					>
						{line.substring(2)}
					</li>
				);
			} else if (line.match(/^\d+\. /)) {
				return (
					<li
						key={i}
						className={`ml-6 list-decimal ${isDark ? "text-gray-300" : "text-gray-700"}`}
					>
						{line.substring(line.indexOf(".") + 2)}
					</li>
				);
			}
			// Checkboxes
			else if (line.includes("[ ]") || line.includes("[x]")) {
				const checked = line.includes("[x]");
				const text = line.replace("[ ]", "").replace("[x]", "").trim();
				return (
					<div key={i} className="flex items-center gap-2 mb-1">
						<input
							type="checkbox"
							checked={checked}
							readOnly
							className="h-4 w-4 rounded border-gray-300 text-lime-500"
						/>
						<span
							className={
								isDark ? "text-gray-300" : "text-gray-700"
							}
						>
							{text}
						</span>
					</div>
				);
			}
			// Blockquotes
			else if (line.startsWith("> ")) {
				return (
					<blockquote
						key={i}
						className={`pl-4 border-l-4 border-lime-500 italic my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
					>
						{line.substring(2)}
					</blockquote>
				);
			}
			// Code blocks
			else if (line.startsWith("```")) {
				return null; // Skip code block markers, handled separately
			}
			// Horizontal rule
			else if (line.startsWith("---")) {
				return (
					<hr
						key={i}
						className={`my-4 ${isDark ? "border-gray-700" : "border-gray-200"}`}
					/>
				);
			}
			// Tables
			else if (line.includes("|")) {
				const cells = line.split("|").filter((cell) => cell.trim());
				if (line.includes("---")) {
					return null; // Skip table separator
				}
				return (
					<div key={i} className="flex gap-4 mb-1">
						{cells.map((cell, idx) => (
							<span
								key={idx}
								className={`flex-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}
							>
								{cell.trim()}
							</span>
						))}
					</div>
				);
			}
			// Regular text with inline formatting
			else {
				// Process inline formatting
				let processedLine = line
					.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
					.replace(/\*(.*?)\*/g, "<em>$1</em>")
					.replace(/~~(.*?)~~/g, "<del>$1</del>")
					.replace(
						/`(.*?)`/g,
						'<code class="bg-gray-800 text-lime-400 px-1 rounded">$1</code>',
					)
					.replace(
						/\[(.*?)\]\((.*?)\)/g,
						'<a href="$2" class="text-lime-500 hover:underline">$1</a>',
					);

				if (line === "") {
					return <br key={i} />;
				}

				return (
					<p
						key={i}
						className={`mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
						dangerouslySetInnerHTML={{ __html: processedLine }}
					/>
				);
			}
		});
	};

	if (loading && notes.length === 0) {
		return (
			<div
				className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-950" : "bg-gray-50"}`}
			>
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto mb-4"></div>
					<p className={isDark ? "text-gray-400" : "text-gray-600"}>
						Loading notes...
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
						className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
					>
						Notes
					</h1>
					<p className={isDark ? "text-gray-400" : "text-gray-600"}>
						Organize and access all your project notes in one place
					</p>
				</div>

				{/* Stats Bar */}
				<div
					className={`rounded-2xl border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"} p-6 mb-6`}
				>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div>
							<div className="flex items-center gap-3">
								<div
									className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
								>
									<DocumentTextIcon className="h-6 w-6 text-lime-500" />
								</div>
								<div>
									<p
										className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
									>
										{notes.length}
									</p>
									<p
										className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
									>
										Total Notes
									</p>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-3">
								<div
									className={`p-3 rounded-lg ${isDark ? "bg-yellow-900/30" : "bg-yellow-100"}`}
								>
									<MapPinIcon className="h-6 w-6 text-yellow-500" />
								</div>
								<div>
									<p
										className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
									>
										{notes.filter((n) => n.isPinned).length}
									</p>
									<p
										className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
									>
										Pinned Notes
									</p>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-3">
								<div
									className={`p-3 rounded-lg ${isDark ? "bg-blue-900/30" : "bg-blue-100"}`}
								>
									<TagIcon className="h-6 w-6 text-blue-500" />
								</div>
								<div>
									<p
										className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
									>
										{getAllTags().length}
									</p>
									<p
										className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
									>
										Unique Tags
									</p>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-3">
								<div
									className={`p-3 rounded-lg ${isDark ? "bg-purple-900/30" : "bg-purple-100"}`}
								>
									<ClockIcon className="h-6 w-6 text-purple-500" />
								</div>
								<div>
									<p
										className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
									>
										{
											notes.filter((n) => {
												const updated = new Date(
													n.updatedAt || n.createdAt,
												);
												const weekAgo = new Date();
												weekAgo.setDate(
													weekAgo.getDate() - 7,
												);
												return updated > weekAgo;
											}).length
										}
									</p>
									<p
										className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
									>
										Updated This Week
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Action Bar */}
				<div
					className={`rounded-2xl border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"} p-4 md:p-6 mb-6`}
				>
					<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
						{/* Project Selector and Search - Stack on mobile */}
						<div className="flex flex-col sm:flex-row gap-4 flex-1">
							<div className="relative flex-1">
								<select
									value={selectedProject}
									onChange={(e) =>
										setSelectedProject(e.target.value)
									}
									className={`w-full px-4 py-2 rounded-lg border ${isDark ? "border-gray-700 bg-gray-800 text-white" : "border-gray-300 bg-white text-gray-900"}`}
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

							<div className="relative flex-1">
								<div className="absolute left-3 top-1/2 transform -translate-y-1/2">
									<MagnifyingGlassIcon
										className={`h-5 w-5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
									/>
								</div>
								<input
									type="text"
									placeholder="Search notes..."
									value={searchQuery}
									onChange={(e) =>
										setSearchQuery(e.target.value)
									}
									className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? "border-gray-700 bg-gray-800 text-white focus:border-lime-500" : "border-gray-300 bg-white text-gray-900 focus:border-lime-500"} focus:ring-2 focus:ring-lime-500/20 focus:outline-none`}
								/>
							</div>
						</div>

						{/* Filters - Wrap on mobile */}
						<div className="flex flex-wrap items-center gap-3">
							<div className="relative">
								<select
									value={tagFilter}
									onChange={(e) =>
										setTagFilter(e.target.value)
									}
									className={`px-4 py-2 rounded-lg border appearance-none pr-8 ${isDark ? "border-gray-700 bg-gray-800 text-white" : "border-gray-300 bg-white text-gray-900"}`}
								>
									<option value="all">All Tags</option>
									{getAllTags().map((tag) => (
										<option key={tag} value={tag}>
											#{tag}
										</option>
									))}
								</select>
								<TagIcon
									className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
								/>
							</div>

							<div className="relative">
								<select
									value={sortBy}
									onChange={(e) => setSortBy(e.target.value)}
									className={`px-4 py-2 rounded-lg border appearance-none pr-8 ${isDark ? "border-gray-700 bg-gray-800 text-white" : "border-gray-300 bg-white text-gray-900"}`}
								>
									<option value="pinned">Pinned First</option>
									<option value="newest">Newest First</option>
									<option value="oldest">Oldest First</option>
									<option value="title_asc">Title A-Z</option>
									<option value="title_desc">
										Title Z-A
									</option>
								</select>
								<FunnelIcon
									className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
								/>
							</div>

							<button
								onClick={() => setShowCreateModal(true)}
								className="px-4 py-2 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-lg font-medium hover:from-lime-600 hover:to-lime-700 flex items-center gap-2 whitespace-nowrap"
							>
								<PlusIcon className="h-4 w-4" />
								<span>New Note</span>
							</button>
						</div>
					</div>

					{/* Pinned Only Toggle - Always visible */}
					<div className="flex items-center gap-3 mt-4">
						<button
							onClick={() => setShowPinnedOnly(!showPinnedOnly)}
							className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
								showPinnedOnly
									? isDark
										? "bg-yellow-900/30 text-yellow-400 border border-yellow-500/50"
										: "bg-yellow-50 text-yellow-700 border border-yellow-500"
									: isDark
										? "bg-gray-800 text-gray-300 hover:bg-gray-700"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							<MapPinIcon className="h-4 w-4" />
							{showPinnedOnly
								? "Showing Pinned Only"
								: "Show Pinned Only"}
						</button>
					</div>
				</div>

				{/* Success/Error Messages */}
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

				{/* Notes List - VERTICAL LIST FORMAT */}
				{filteredNotes.length === 0 ? (
					<div
						className={`rounded-2xl border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"} p-12 text-center`}
					>
						<DocumentTextIcon
							className={`h-16 w-16 mx-auto mb-4 ${isDark ? "text-gray-700" : "text-gray-300"}`}
						/>
						<h3
							className={`text-xl font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
						>
							{searchQuery ||
							tagFilter !== "all" ||
							showPinnedOnly
								? "No matching notes found"
								: "No notes yet"}
						</h3>
						<p
							className={`mb-6 ${isDark ? "text-gray-500" : "text-gray-500"}`}
						>
							{searchQuery ||
							tagFilter !== "all" ||
							showPinnedOnly
								? "Try adjusting your filters"
								: selectedProject === "all"
									? "Select a project or create your first note"
									: "Create your first note for this project"}
						</p>
						<button
							onClick={() => setShowCreateModal(true)}
							className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-lg font-medium hover:from-lime-600 hover:to-lime-700"
						>
							<PlusIcon className="h-4 w-4" />
							Create Note
						</button>
					</div>
				) : (
					<div className="space-y-4">
						{filteredNotes.map((note) => (
							<div
								key={note._id}
								className={`rounded-2xl border overflow-hidden transition-all hover:shadow-lg relative ${
									note.isPinned
										? isDark
											? "border-yellow-500/30 bg-yellow-900/10"
											: "border-yellow-500/50 bg-yellow-50"
										: isDark
											? "border-gray-800 bg-gray-900/50 hover:border-lime-500/30"
											: "border-gray-200 bg-white hover:border-lime-500/50"
								}`}
							>
								{/* Pin Badge - Always visible on mobile */}
								{note.isPinned && (
									<div className="absolute top-4 right-4 md:right-12 z-10">
										<MapPinIcon className="h-4 w-4 text-yellow-500" />
									</div>
								)}

								<div className="p-6">
									{/* Header Row */}
									<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<h3
													className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}
												>
													{note.title}
												</h3>
												{selectedProject === "all" &&
													note.projectName && (
														<span
															className={`text-xs px-2 py-1 rounded-full ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"}`}
														>
															{note.projectName}
														</span>
													)}
											</div>
										</div>

										{/* Actions Menu */}
										<div className="relative flex-shrink-0 self-end sm:self-auto">
											<button
												onClick={() =>
													setShowNoteMenu(
														showNoteMenu ===
															note._id
															? null
															: note._id,
													)
												}
												className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
											>
												<EllipsisVerticalIcon className="h-5 w-5" />
											</button>

											{showNoteMenu === note._id && (
												<div
													className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50 ${
														isDark
															? "bg-gray-800 border border-gray-700"
															: "bg-white border border-gray-200"
													}`}
												>
													<button
														onClick={() =>
															handleUpdateNote(
																note._id,
																{
																	isPinned:
																		!note.isPinned,
																},
															)
														}
														className={`flex items-center gap-2 w-full px-4 py-3 text-left ${
															isDark
																? "hover:bg-gray-700 text-gray-300"
																: "hover:bg-gray-50 text-gray-700"
														}`}
													>
														<MapPinIcon className="h-4 w-4" />
														{note.isPinned
															? "Unpin Note"
															: "Pin Note"}
													</button>
													<button
														onClick={() => {
															setEditingNote(
																note,
															);
															setShowNoteMenu(
																null,
															);
															// Implement edit modal here
														}}
														className={`flex items-center gap-2 w-full px-4 py-3 text-left ${
															isDark
																? "hover:bg-gray-700 text-gray-300"
																: "hover:bg-gray-50 text-gray-700"
														}`}
													>
														<PencilIcon className="h-4 w-4" />
														Edit Note
													</button>
													<button
														onClick={() =>
															handleDeleteNote(
																note._id,
																note.projectId,
															)
														}
														className={`flex items-center gap-2 w-full px-4 py-3 text-left ${
															isDark
																? "hover:bg-red-900/30 text-red-400"
																: "hover:bg-red-50 text-red-600"
														}`}
													>
														<TrashIcon className="h-4 w-4" />
														Delete Note
													</button>
												</div>
											)}
										</div>
									</div>

									{/* Tags */}
									{note.tags && note.tags.length > 0 && (
										<div className="flex flex-wrap gap-1 mb-4">
											{note.tags.map((tag, index) => (
												<span
													key={index}
													className={`text-xs px-2 py-1 rounded-full ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"}`}
												>
													#{tag}
												</span>
											))}
										</div>
									)}

									{/* Content with proper dark mode text */}
									<div
										className={`prose max-w-none mb-4 ${isDark ? "prose-invert" : ""}`}
									>
										{renderContent(note.content)}
									</div>

									{/* Footer with Author Info */}
									<div
										className={`flex items-center justify-between pt-4 border-t ${isDark ? "border-gray-800" : "border-gray-100"}`}
									>
										<div className="flex items-center gap-2">
											<div className="h-8 w-8 rounded-full bg-gradient-to-r from-lime-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
												{note.createdBy?.username
													?.charAt(0)
													.toUpperCase() || "?"}
											</div>
											<div>
												<p
													className={`text-xs font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}
												>
													{note.createdBy?.username ||
														"Unknown"}
												</p>
												<p
													className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}
												>
													{formatDate(
														note.updatedAt ||
															note.createdAt,
													)}
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Pagination/Info */}
				<div className="mt-6 flex items-center justify-between">
					<p className={isDark ? "text-gray-400" : "text-gray-600"}>
						Showing {filteredNotes.length} of {notes.length} notes
					</p>
					<div className="flex items-center gap-2">
						<button
							className={`px-3 py-1 rounded ${isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
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
							className={`px-3 py-1 rounded ${isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
							disabled
						>
							Next
						</button>
					</div>
				</div>
			</div>

			{/* Create Note Modal (unchanged) */}
			{showCreateModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div
						className={`w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto ${isDark ? "bg-gray-900" : "bg-white"} p-6`}
					>
						<div className="flex items-center justify-between mb-6">
							<h3
								className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
							>
								<PlusIcon className="h-5 w-5 inline mr-2" />
								Create New Note
							</h3>
							<button
								onClick={() => setShowCreateModal(false)}
								className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
							>
								<XMarkIcon className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={handleCreateNote}>
							<div className="space-y-6">
								{selectedProject === "all" && (
									<div>
										<label
											className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
										>
											Project *
										</label>
										<select
											value={newNote.projectId || ""}
											onChange={(e) =>
												setNewNote({
													...newNote,
													projectId: e.target.value,
												})
											}
											className={`w-full px-4 py-3 rounded-lg border ${isDark ? "border-gray-700 bg-gray-800 text-white" : "border-gray-300 bg-white text-gray-900"}`}
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
									<div className="md:col-span-2">
										<label
											className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
										>
											Note Title *
										</label>
										<input
											type="text"
											value={newNote.title}
											onChange={(e) =>
												setNewNote({
													...newNote,
													title: e.target.value,
												})
											}
											placeholder="Enter a descriptive title..."
											className={`w-full px-4 py-3 rounded-lg border ${isDark ? "border-gray-700 bg-gray-800 text-white focus:border-lime-500" : "border-gray-300 bg-white text-gray-900 focus:border-lime-500"} focus:ring-2 focus:ring-lime-500/20 focus:outline-none`}
											required
										/>
									</div>

									<div className="md:col-span-2">
										<label
											className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
										>
											Content *
										</label>
										<textarea
											value={newNote.content}
											onChange={(e) =>
												setNewNote({
													...newNote,
													content: e.target.value,
												})
											}
											placeholder="Write your note here... (Markdown supported)"
											rows="8"
											className={`w-full px-4 py-3 rounded-lg border ${isDark ? "border-gray-700 bg-gray-800 text-white" : "border-gray-300 bg-white text-gray-900"} font-mono text-sm`}
											required
										/>
										<p
											className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}
										>
											You can use Markdown formatting for
											rich text
										</p>
									</div>

									<div className="md:col-span-2">
										<label
											className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
										>
											Tags
										</label>
										<div className="flex gap-2 mb-2">
											<input
												type="text"
												value={tagInput}
												onChange={(e) =>
													setTagInput(e.target.value)
												}
												onKeyPress={(e) =>
													e.key === "Enter" &&
													(e.preventDefault(),
													addTag())
												}
												placeholder="Add a tag and press Enter"
												className={`flex-1 px-4 py-2 rounded-lg border ${isDark ? "border-gray-700 bg-gray-800 text-white" : "border-gray-300 bg-white text-gray-900"}`}
											/>
											<button
												type="button"
												onClick={addTag}
												className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
											>
												Add
											</button>
										</div>
										<div className="flex flex-wrap gap-2">
											{newNote.tags.map((tag, index) => (
												<span
													key={index}
													className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"}`}
												>
													#{tag}
													<button
														type="button"
														onClick={() =>
															removeTag(tag)
														}
														className="ml-1 hover:text-red-500"
													>
														<XMarkIcon className="h-3 w-3" />
													</button>
												</span>
											))}
										</div>
									</div>

									<div>
										<label className="flex items-center gap-2 cursor-pointer">
											<div className="relative">
												<input
													type="checkbox"
													checked={newNote.isPinned}
													onChange={(e) =>
														setNewNote({
															...newNote,
															isPinned:
																e.target
																	.checked,
														})
													}
													className="sr-only"
												/>
												<div
													className={`w-10 h-6 rounded-full transition ${newNote.isPinned ? "bg-lime-500" : isDark ? "bg-gray-700" : "bg-gray-300"}`}
												></div>
												<div
													className={`absolute left-1 top-1 w-4 h-4 rounded-full transition transform ${newNote.isPinned ? "translate-x-4 bg-white" : isDark ? "bg-gray-400" : "bg-white"}`}
												></div>
											</div>
											<span
												className={`font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}
											>
												<MapPinIcon className="h-4 w-4 inline mr-1" />
												Pin this note
											</span>
										</label>
										<p
											className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}
										>
											Pinned notes appear at the top (max
											3 per project)
										</p>
									</div>
								</div>
							</div>

							<div className="flex items-center gap-3 mt-6">
								<button
									type="submit"
									className="flex-1 px-6 py-3 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-lg font-medium hover:from-lime-600 hover:to-lime-700"
								>
									Create Note
								</button>
								<button
									type="button"
									onClick={() => setShowCreateModal(false)}
									className={`flex-1 px-6 py-3 rounded-lg font-medium ${isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
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
