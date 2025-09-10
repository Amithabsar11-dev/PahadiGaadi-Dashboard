import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAdminStore } from "../store/AdminStore";
import { useNavigate } from "react-router-dom";

export default function AdminSignIn() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const setAdminId = useAdminStore((s) => s.setAdminId);
  const setAdminRole = useAdminStore((s) => s.setAdminRole);
  const setAdminName = useAdminStore((s) => s.setAdminName);

  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();

    if (!phone) {
      window.alert("Please enter your phone number.");
      return;
    }

    const email = `${phone}@admin.app`;
    const password = phone + "123456";
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      window.alert("Login Error: " + error.message);
      return;
    }

    const userId = data.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("role, name")
      .eq("id", userId)
      .maybeSingle();

    setLoading(false);

    if (profileError) {
      await supabase.auth.signOut();
      window.alert("Error fetching profile: " + profileError.message);
      return;
    }

    if (!profile) {
      await supabase.auth.signOut();
      window.alert("No profile found for this account.");
      return;
    }

    setAdminId(userId);
    setAdminRole(profile.role);
    setAdminName(profile.name);

    navigate("/dashboard", { replace: true });
  };

  return (
    <form
      onSubmit={handleSignIn}
      style={{ maxWidth: 320, margin: "0 auto", padding: 20 }}
    >
      <h2>Admin Sign In</h2>
      <input
        type="text"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 8 }}
      />
      <button
        type="submit"
        style={{
          width: "100%",
          padding: 10,
          background: "#00621F",
          color: "#fff",
        }}
        disabled={loading}
      >
        {loading ? "Loading..." : "Sign In"}
      </button>
    </form>
  );
}
