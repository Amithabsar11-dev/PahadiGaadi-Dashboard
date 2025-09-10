import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminSignUp() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Manager');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!name || !phone || !role) {
      window.alert('Missing Fields: Enter name, phone, and select role.');
      return;
    }

    const email = `${phone}@admin.app`;
    const password = phone + '123456';
    setLoading(true);

    // Create Auth user
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      if (error.message.includes('User already registered')) {
        window.alert('User already exists. Please sign in.');
        navigate('/signin');
      } else {
        window.alert('Signup Error: ' + error.message);
      }
      return;
    }

    const adminId = data?.user?.id;

    // Insert into admin_profiles table
    try {
      const { error: insertErr } = await supabase
        .from('admin_profiles')
        .insert([{ id: adminId, name, phone, role }], { returning: 'minimal' });

      if (insertErr) {
        throw insertErr;
      }
    } catch (insertError) {
      window.alert('Error saving admin profile: ' + insertError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    window.alert('Signup successful! Please sign in.');
    navigate('/signin', { replace: true });
  };

  return (
    <form
      onSubmit={handleSignUp}
      style={{
        maxWidth: 320,
        margin: "0 auto",
        padding: 20,
        background: "#fafcff",
        borderRadius: 8,
        boxShadow: "0 0 12px #eee"
      }}
    >
      <h2>Admin Sign Up</h2>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{
          width: "100%", marginBottom: 14, padding: 10, borderRadius: 6, border: "1px solid #ccc"
        }}
      />
      <input
        type="text"
        placeholder="Phone"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        style={{
          width: "100%", marginBottom: 14, padding: 10, borderRadius: 6, border: "1px solid #ccc"
        }}
        inputMode="numeric"
        pattern="[0-9]*"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        style={{
          width: "100%", marginBottom: 14, padding: 10, borderRadius: 6, border: "1px solid #ccc"
        }}
      >
        <option value="Super Admin">Super Admin</option>
        <option value="Manager">Manager</option>
        <option value="Demand Caller">Demand Caller</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%", padding: 12, border: "none", background: "#00621F",
          color: "#fff", fontWeight: "bold", fontSize: 16, borderRadius: 5,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? "Signing Up..." : "Sign Up"}
      </button>
    </form>
  );
}
