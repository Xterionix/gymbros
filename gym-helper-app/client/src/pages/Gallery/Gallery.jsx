import React, { useRef, useState } from "react";
import { useAuth } from "../../contexts/theme/AuthContext";
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

  const simpleCard = "bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm";

  return (
    <main className="flex flex-col h-[calc(100vh-5rem)] bg-slate-100 text-slate-900 dark:bg-[#0b101e] dark:text-gray-100 p-4 lg:p-6 overflow-hidden font-sans">
      <div className="shrink-0 mb-4">
        <p className="text-xs uppercase tracking-widest text-blue-500 mb-1 font-semibold">Progress Gallery</p>
        <h1 className="text-3xl lg:text-4xl font-extrabold dark:text-white">Uploaded images</h1>
      </div>

      <div className="flex h-full flex-col gap-4 min-h-0">
        <section className={`${simpleCard} flex-1 min-h-0 p-4 lg:p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Uploaded images</p>
              <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">Current gallery</h2>
            </div>
            <div className="flex items-center gap-3">
              <p className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:border-gray-700 dark:bg-[#0b101e] dark:text-slate-400">
                {sortedGallery.length} total
              </p>
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
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-gray-100"
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

          {sortedGallery.length === 0 ? (
            <div className="flex h-[calc(100%-3.5rem)] min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center dark:border-gray-700 dark:bg-[#0b101e]">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">No uploaded images yet.</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Use Add Photo to start the gallery.</p>
            </div>
          ) : (
            <div className="grid max-h-[calc(100%-3.5rem)] min-h-0 grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedGallery.map((item, index) => (
                <div key={item._id} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-slate-950 shadow-sm dark:border-gray-700">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={item.url}
                      alt={`Progress ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-600"
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