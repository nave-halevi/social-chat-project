/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import AdminEmptyState from "../components/AdminEmptyState";
import AdminHeader from "../components/AdminHeader";
import ConfirmActionModal from "../components/ConfirmActionModal";
import CourseForm from "../components/CourseForm";
import SectionForm from "../components/SectionForm";
import TaskForm from "../components/TaskForm";
import {
  createSection,
  createTask,
  deleteSection,
  deleteTask,
  getAdminCourses,
  getAdminScenarios,
  getSectionsByCourse,
  getTasksBySection,
  updateCourse,
  updateSection,
  updateTask,
} from "../services/adminService";
import { Page } from "./AdminOverviewPage";

export default function AdminCourseEditorPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courseError, setCourseError] = useState(null);
  const [sectionError, setSectionError] = useState(null);
  const [taskError, setTaskError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sectionEdit, setSectionEdit] = useState(undefined);
  const [taskEdit, setTaskEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [courses, sectionData, scenarioData] = await Promise.all([
        getAdminCourses(),
        getSectionsByCourse(courseId),
        getAdminScenarios(),
      ]);
      const sectionsWithTasks = await Promise.all(
        sectionData.map(async (section) => ({
          ...section,
          tasks: await getTasksBySection(section.id),
        })),
      );

      setCourse(courses.find((item) => item.id === courseId) || null);
      setSections(sectionsWithTasks);
      setScenarios(scenarioData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (operation, setMutationError = setError) => {
    setBusy(true);
    setMutationError(null);
    try {
      await operation();
      await load();
      return true;
    } catch (requestError) {
      setMutationError(requestError.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openSectionForm = (section) => {
    setSectionError(null);
    setSectionEdit(section);
  };

  const closeSectionForm = () => {
    setSectionError(null);
    setSectionEdit(undefined);
  };

  const openTaskForm = (sectionId, task) => {
    setTaskError(null);
    setTaskEdit({ sectionId, task });
  };

  const closeTaskForm = () => {
    setTaskError(null);
    setTaskEdit(null);
  };

  if (loading) return <Page>Loading course editor...</Page>;
  if (!course) {
    return (
      <Page>
        <p className="text-red-400">{error || "Course not found."}</p>
      </Page>
    );
  }

  return (
    <Page>
      <Link to="/admin/academy" className="text-sm text-zinc-400">
        ← Academy
      </Link>
      <div className="mt-4">
        <AdminHeader
          title={course.title}
          description="Edit course metadata, ordered sections, and tasks."
        />
      </div>
      {error && <p className="mb-4 text-red-400">{error}</p>}

      <CourseForm
        key={`${course.id}-${course.slug}-${course.is_published}`}
        course={course}
        busy={busy}
        error={courseError}
        onCancel={() => {
          setCourseError(null);
          load();
        }}
        onSave={(payload) => run(() => updateCourse(course.id, payload), setCourseError)}
      />

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Sections</h2>
        <button
          onClick={() => openSectionForm(null)}
          className="rounded-lg bg-red-600 px-4 py-2"
        >
          Add Section
        </button>
      </div>

      {sectionEdit !== undefined && (
        <div className="mt-4">
          <SectionForm
            section={sectionEdit}
            busy={busy}
            error={sectionError}
            onCancel={closeSectionForm}
            onSave={(payload) =>
              run(() =>
                sectionEdit
                  ? updateSection(sectionEdit.id, payload)
                  : createSection({ ...payload, course_id: courseId }),
              setSectionError).then((ok) => ok && closeSectionForm())
            }
          />
        </div>
      )}

      <div className="mt-5 space-y-5">
        {sections.length === 0 ? (
          <AdminEmptyState
            title="No sections yet"
            description="Add the first section to begin building this course."
          />
        ) : (
          sections.map((section) => (
            <section
              key={section.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    {section.order_index}. {section.title}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {section.description}
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => openSectionForm(section)}
                    className="mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      setConfirm({ type: "section", item: section })
                    }
                    className="mr-3 text-red-400"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => openTaskForm(section.id, null)}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-sm"
                  >
                    Add Task
                  </button>
                </div>
              </div>

              {taskEdit?.sectionId === section.id && (
                <div className="mt-4">
                  <TaskForm
                    key={taskEdit.task?.id || `new-${section.id}`}
                    task={taskEdit.task}
                    scenarios={scenarios}
                    busy={busy}
                    error={taskError}
                    onCancel={closeTaskForm}
                    onSave={(payload) =>
                      run(() =>
                        taskEdit.task
                          ? updateTask(taskEdit.task.id, payload)
                          : createTask({ ...payload, section_id: section.id }),
                      setTaskError).then((ok) => ok && closeTaskForm())
                    }
                  />
                </div>
              )}

              <div className="mt-4 space-y-2">
                {section.tasks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">
                    This section has no tasks yet.
                  </p>
                ) : (
                  section.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                    >
                      <div>
                        <span className="mr-2 text-zinc-500">
                          {task.order_index}.
                        </span>
                        {task.title}
                        <span className="ml-3 text-xs text-zinc-500">
                          {task.task_type} · {task.points} pts
                        </span>
                        {task.task_type === "LESSON" &&
                          task.youtube_video_id && (
                            <span className="ml-2 rounded-full border border-red-900 bg-red-950/40 px-2 py-0.5 text-xs text-red-300">
                              Video
                            </span>
                          )}
                      </div>
                      <div>
                        <button
                          onClick={() => openTaskForm(section.id, task)}
                          className="mr-3 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirm({ type: "task", item: task })}
                          className="text-sm text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))
        )}
      </div>

      <ConfirmActionModal
        open={!!confirm}
        title={`Delete ${confirm?.type}?`}
        message="This action cannot be undone."
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          run(() =>
            confirm.type === "section"
              ? deleteSection(confirm.item.id)
              : deleteTask(confirm.item.id),
          ).then((ok) => ok && setConfirm(null))
        }
      />
    </Page>
  );
}
