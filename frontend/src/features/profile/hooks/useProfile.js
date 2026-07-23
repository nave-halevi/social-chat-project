import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../../context/auth-context";
import {
  changePassword,
  getProfile,
  updateAvatar,
  updateProfile,
} from "../services/profileService";

export default function useProfile() {
  const { updateStoredUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorContext, setErrorContext] = useState(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setErrorContext(null);
    setProfileSuccess(null);
    setPasswordSuccess(null);
  }, []);

  const reloadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorContext(null);

    try {
      const data = await getProfile();
      setProfile(data);
      updateStoredUser(data);
      return data;
    } catch (requestError) {
      setError(requestError.message);
      setErrorContext("load");
      return null;
    } finally {
      setLoading(false);
    }
  }, [updateStoredUser]);

  useEffect(() => {
    let isActive = true;

    getProfile()
      .then((data) => {
        if (!isActive) return;
        setProfile(data);
        updateStoredUser(data);
      })
      .catch((requestError) => {
        if (!isActive) return;
        setError(requestError.message);
        setErrorContext("load");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [updateStoredUser]);

  const updateProfileDetails = useCallback(
    async (payload) => {
      clearMessages();
      setIsUpdatingProfile(true);

      try {
        const data = await updateProfile(payload);
        setProfile(data);
        updateStoredUser(data);
        setProfileSuccess("Profile details updated successfully.");
        return data;
      } catch (requestError) {
        setError(requestError.message);
        setErrorContext("profile");
        return null;
      } finally {
        setIsUpdatingProfile(false);
      }
    },
    [clearMessages, updateStoredUser],
  );

  const updatePassword = useCallback(
    async (payload) => {
      clearMessages();
      setIsChangingPassword(true);

      try {
        const data = await changePassword(payload);
        setPasswordSuccess(data.message || "Password updated successfully.");
        return true;
      } catch (requestError) {
        setError(requestError.message);
        setErrorContext("password");
        return false;
      } finally {
        setIsChangingPassword(false);
      }
    },
    [clearMessages],
  );

  const updateProfileAvatar = useCallback(
    async (avatarUrl) => {
      clearMessages();
      setIsUpdatingAvatar(true);

      try {
        const data = await updateAvatar(avatarUrl);
        setProfile(data);
        updateStoredUser(data);
        setProfileSuccess(
          avatarUrl
            ? "Profile image updated successfully."
            : "Profile image removed successfully.",
        );
        return data;
      } catch (requestError) {
        setError(requestError.message);
        setErrorContext("avatar");
        return null;
      } finally {
        setIsUpdatingAvatar(false);
      }
    },
    [clearMessages, updateStoredUser],
  );

  return {
    profile,
    loading,
    error,
    errorContext,
    isUpdatingProfile,
    isChangingPassword,
    isUpdatingAvatar,
    profileSuccess,
    passwordSuccess,
    reloadProfile,
    updateProfileDetails,
    updatePassword,
    updateProfileAvatar,
    clearMessages,
  };
}
