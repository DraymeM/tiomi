import React, { Suspense, useState } from "react";
import { Tab } from "@headlessui/react";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { updatePassword } from "@/api/repo";
import { FaArrowAltCircleRight } from "react-icons/fa";
import PasswordForm, { passwordSchema } from "./profil/PasswordForm";
import PageTransition from "../PageTransition";
import OfflinePlaceholder from "../../OfflinePlaceholder";
import { useOnlineStatus } from "../../../hooks/useOnlineStatus";
const Sidebar = React.lazy(() => import("./profil/Sidebar"));
const UserInfo = React.lazy(() => import("./profil/UserInfo"));

const Profile: React.FC = () => {
  const { logout, isAuthenticated, isSuperUser, username } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isOnline = useOnlineStatus();

  // Password state and handlers
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Sikeres kijelentkezés!");
      navigate({ to: "/login" });
    } catch {
      toast.error("Hiba történt a kijelentkezés során");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);

    const validation = passwordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      await updatePassword(currentPassword, newPassword, confirmPassword);
      setSuccessMessage("Jelszó sikeresen frissítve!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    } catch (error: any) {
      setErrors({
        general:
          error.response?.data?.error || "Hiba történt a jelszó frissítésekor",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOnline) {
    return <OfflinePlaceholder />;
  }

  return (
    <PageTransition>
      <Suspense>
        <div className="lg:hidden p-4 flex justify-between items-center z-50">
          <button
            className="p-2 border-border rounded-md focus:outline-none"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
          >
            <FaArrowAltCircleRight size={36} />
          </button>
        </div>

        <Tab.Group>
          <div className="flex flex-col lg:flex-row relative min-h-[calc(60dvh-4rem)]">
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
            <div className="flex-1 md:p-4  mx-auto max-w-sm md:max-w-lg lg:max-w-full lg:ml-64 lg:mr-64">
              <Tab.Panels>
                <Tab.Panel>
                  <UserInfo
                    username={username || ""}
                    isSuperUser={isSuperUser}
                    isAuthenticated={isAuthenticated}
                    onLogout={handleLogout}
                  />
                </Tab.Panel>
                <Tab.Panel>
                  <PasswordForm
                    onSubmit={handlePasswordSubmit}
                    errors={errors}
                    isSubmitting={isSubmitting}
                    successMessage={successMessage}
                    currentPassword={currentPassword}
                    newPassword={newPassword}
                    confirmPassword={confirmPassword}
                    setCurrentPassword={setCurrentPassword}
                    setNewPassword={setNewPassword}
                    setConfirmPassword={setConfirmPassword}
                  />
                </Tab.Panel>
              </Tab.Panels>
            </div>
          </div>
        </Tab.Group>
      </Suspense>
    </PageTransition>
  );
};

export default Profile;
