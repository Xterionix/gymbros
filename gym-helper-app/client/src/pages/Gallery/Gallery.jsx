import React, { useRef, useState } from "react";
import { useAuth } from "../../contexts/theme/AuthContext";
import { IoArrowBack } from "react-icons/io5";
import { FiPlus, FiTrash2 } from "react-icons/fi"; // Icon for upload
import { useNavigate } from "react-router-dom";

export default function Gallery() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  // Handle File Selection
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("http://localhost:5000/api/auth/me/gallery", {
        method: "POST", // Note: We use POST for adding new items
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setUser(json.data); // Update global user state with new gallery data
      } else {
        console.error("Failed to upload image");
      }
    } catch (err) {
      console.error("Error uploading image:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/auth/me/gallery/${imageId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        const json = await res.json();
        setUser(json.data); // Update UI immediately
      } else {
        console.error("Failed to delete image");
      }
    } catch (err) {
      console.error("Error deleting image:", err);
    }
  };

  // Sort gallery by date (newest first)
  const sortedGallery = user?.gallery?.slice().sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  ) || [];

  return (
    <main className="relative h-[calc(100vh-5rem)] overflow-hidden bg-slate-100 text-slate-900 dark:bg-[#0b101e] dark:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl dark:bg-blue-500/20" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-500/15" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/10" />
      </div>

      <div className="relative flex h-full flex-col gap-4 p-4 lg:p-6">
        <header className="shrink-0 rounded-[2rem] border border-white/10 bg-white/80 px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:bg-[#111827]/85 dark:shadow-[0_18px_60px_rgba(0,0,0,0.35)] lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/profile")}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:-translate-x-0.5 hover:border-blue-200 hover:text-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:text-blue-400"
              >
                <IoArrowBack className="h-5 w-5" />
              </button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-blue-600 dark:text-blue-400">Progress Gallery</p>
                <h1 className="text-2xl font-black leading-tight lg:text-3xl">Uploaded images</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
              <button
                onClick={() => fileInputRef.current.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.22)] transition-transform duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
              >
                {isUploading ? (
                  <span className="animate-pulse">Uploading...</span>
                ) : (
                  <>
                    <FiPlus className="h-4 w-4" />
                    <span>Add Photo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        <section className="min-h-0 rounded-[2rem] border border-white/10 bg-white/80 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:bg-[#111827]/85 dark:shadow-[0_18px_60px_rgba(0,0,0,0.35)] lg:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Uploaded images</p>
              <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">Current gallery</h2>
            </div>
            <p className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              {sortedGallery.length} total
            </p>
          </div>

          {sortedGallery.length === 0 ? (
            <div className="flex h-[calc(100%-3.5rem)] min-h-[260px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 text-center dark:border-white/10 dark:bg-white/5">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">No uploaded images yet.</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Use Add Photo to start the gallery.</p>
            </div>
          ) : (
            <div className="grid max-h-[calc(100%-3.5rem)] min-h-0 grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedGallery.map((item, index) => (
                <div key={item._id} className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-lg dark:border-white/10">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={item.url}
                      alt={`Progress ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-red-600"
                      title="Delete Photo"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/70">
                        Progress shot
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {new Date(item.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}