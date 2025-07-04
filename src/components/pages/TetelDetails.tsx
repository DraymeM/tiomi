import React, { Suspense, useEffect, useMemo, useState } from "react";
import {
  useParams,
  useLocation,
  Outlet,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTetelDetails, deleteTetel } from "../../api/repo";
import type { TetelDetailsResponse } from "../../api/types";
import { FaArrowLeft, FaPen, FaRegClock, FaTrash } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import PageTransition from "../common/PageTransition";
import OfflinePlaceholder from "../OfflinePlaceholder";

// Lazy-loaded components
const DeleteModal = React.lazy(() => import("../common/Forms/DeleteModal"));
const SpeechController = React.lazy(() => import("../common/SpeechController"));
const MarkdownHandler = React.lazy(
  () => import("../common/markdown/MarkdownHandler")
);

const getTextFromMarkdown = (markdown: string) => {
  let cleanedText = markdown
    .replace(/<[^>]+>/g, "")
    .replace(/{[^}]+}/g, "")
    .replace(/&[a-zA-Z0-9#]+;/g, "")

    .replace(/[#_*>\-]/g, "")
    .replace(/\[.*?\]\(.*?\)/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleanedText;
};

function calculateReadingTime(
  sections: TetelDetailsResponse["sections"],
  osszegzes?: TetelDetailsResponse["osszegzes"]
): number {
  let totalText = "";

  sections.forEach((section) => {
    totalText += " " + getTextFromMarkdown(section.content);
    section.subsections?.forEach((sub) => {
      totalText += " " + getTextFromMarkdown(sub.title || "");
      totalText += " " + getTextFromMarkdown(sub.description || "");
    });
  });

  if (osszegzes?.content) {
    totalText += " " + getTextFromMarkdown(osszegzes.content);
  }

  const wordCount = totalText.split(" ").filter(Boolean).length;
  return Math.ceil(wordCount / 200);
}

export default function TetelDetails() {
  const { isAuthenticated, isSuperUser } = useAuth(); // Hook 1
  const { id } = useParams({ strict: false }); // Hook 2
  const tetelId = Number(id);
  const location = useLocation(); // Hook 3
  const navigate = useNavigate(); // Hook 4
  const queryClient = useQueryClient(); // Hook 5
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // Hook 6
  const { data, error } = useQuery<TetelDetailsResponse, Error>({
    queryKey: ["tetelDetail", tetelId],
    queryFn: () => fetchTetelDetails(tetelId),
    enabled: !isNaN(tetelId) && tetelId > 0,
    retry: 2,
    refetchOnWindowFocus: false,
  }); // Hook 7
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]); // Hook 8
  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!isAuthenticated || !isSuperUser) {
        toast.error("Nincs engedélyed a művelethez");
        throw new Error("Nincs engedélyed a művelethez");
      }
      return deleteTetel(tetelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tetelek"] });
      toast.success("Sikeresen törölted a tételt.");
      navigate({ to: "/tetelek" });
    },
  }); // Hook 9
  const isEditMode = location.pathname.includes("/edit");
  const tetel = data?.tetel ?? { id: 0, name: "Ismeretlen tétel" };
  const osszegzes = data?.osszegzes;
  const sections = data?.sections ?? [];
  const readingMinutes = calculateReadingTime(sections, osszegzes);
  const textToSpeak = useMemo(() => {
    return [
      getTextFromMarkdown(tetel.name),
      ...sections.flatMap((section) => [
        getTextFromMarkdown(section.content),
        ...(section.subsections?.flatMap((sub) => [
          getTextFromMarkdown(sub.title || ""),
          getTextFromMarkdown(sub.description || ""),
        ]) ?? []),
      ]),
      osszegzes?.content
        ? "Összegzés: " + getTextFromMarkdown(osszegzes.content)
        : "",
    ]
      .filter((text) => text && text.length > 0)
      .join(" ")
      .trim();
  }, [tetel.name, sections, osszegzes]); // Hook 10

  // Early returns after all hooks
  if (error) {
    if (!navigator.onLine) {
      return <OfflinePlaceholder />;
    }
    return (
      <div className="p-10 text-red-500 text-center">
        Hiba történt: {error.message}
      </div>
    );
  }

  if (isEditMode) {
    return <Outlet />;
  }

  return (
    <Suspense>
      <main className="relative md:max-w-[75dvw] max-w-full mx-auto md:px-0 px-2 pb-20 text-left">
        <PageTransition>
          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <Link
              to="/tetelek/$id"
              params={{ id: tetelId.toString() }}
              className="inline-flex items-center px-3 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              aria-label="Vissza a tétel áttekintéséhez"
              title="Vissza a tételhez"
            >
              <FaArrowLeft className="mr-2" aria-hidden="true" />
              Vissza
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm mx-auto text-secondary-foreground">
                <FaRegClock
                  className="inline mr-1"
                  size={15}
                  aria-hidden="true"
                />
                {readingMinutes} perc
              </span>
              <SpeechController text={textToSpeak} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-8 text-center text-foreground">
            {tetel.name}
          </h1>

          {/* Content */}
          <div className="space-y-6">
            <Suspense
              fallback={
                <div className="bg-secondary rounded-lg p-6 shadow-xl animate-pulse" />
              }
            >
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="bg-secondary rounded-lg p-6 shadow-xl border border-transparent hover:border-border transition-colors"
                >
                  <div className="text-xl font-semibold mb-4 text-foreground">
                    <MarkdownHandler content={section.content} />
                  </div>

                  {section.subsections?.map((sub) => (
                    <div
                      key={sub.id}
                      className="ml-4 mb-4 p-4 bg-muted rounded-lg"
                    >
                      <div className="font-medium text-foreground mb-2">
                        <MarkdownHandler content={sub.title} />
                      </div>
                      <div className="text-secondary-foreground prose prose-invert max-w-none">
                        <MarkdownHandler content={sub.description} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {osszegzes?.content && (
                <div className="bg-secondary rounded-lg p-6 border border-transparent hover:border-border transition-colors">
                  <h2 className="text-2xl font-bold mb-4 text-foreground">
                    Összegzés
                  </h2>
                  <div className="text-foreground prose prose-invert max-w-none whitespace-pre-wrap">
                    <MarkdownHandler content={osszegzes.content} />
                  </div>
                </div>
              )}
            </Suspense>
          </div>

          {/* Delete Modal */}
          <DeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onDelete={() => deleteMutation.mutate()}
            isDeleting={deleteMutation.isPending}
            itemName={tetel.name}
          />
        </PageTransition>

        {isAuthenticated && isSuperUser ? (
          <>
            {/* Delete button in primary position */}
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="fixed md:bottom-2 bottom-14 right-2 p-3 bg-rose-600 text-white rounded-full hover:bg-rose-700 hover:cursor-pointer transition-all transform hover:scale-105 flex items-center justify-center z-50"
              title="Töröld a tételt"
              aria-label="Töröld a tételt"
            >
              <FaTrash size={20} aria-hidden="true" />
            </button>

            {/* Edit button in secondary position */}
            <Link
              to="/tetelek/$id/details/edit"
              params={{ id: tetelId.toString() }}
              className="fixed md:bottom-16 bottom-28 right-2 p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center justify-center z-50"
              title="Szerkeszd a tételt"
              aria-label="Szerkeszd a tételt"
            >
              <FaPen size={20} aria-hidden="true" />
            </Link>
          </>
        ) : isAuthenticated ? (
          <Link
            to="/tetelek/$id/details/edit"
            params={{ id: tetelId.toString() }}
            className="fixed md:bottom-2 bottom-14 right-2 p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center justify-center z-50"
            title="Szerkeszd a tételt"
            aria-label="Szerkeszd a tételt"
          >
            <FaPen size={20} aria-hidden="true" />
          </Link>
        ) : null}
      </main>
    </Suspense>
  );
}
