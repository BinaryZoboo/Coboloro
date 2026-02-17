import { motion } from "framer-motion";
import {
  CalendarIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { supabase } from "../lib/supabaseClient";
import type { Category } from "../transaction";

interface CategoriesPageProps {
  onLogout: () => void;
  userId: string;
  activeItem?: string;
  onNavigate?: (itemId: string) => void;
}

export function CategoriesPage({
  onLogout,
  userId,
  activeItem,
  onNavigate,
}: CategoriesPageProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<Category["type"]>("expense");
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingType, setEditingType] = useState<Category["type"]>("expense");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [userProfile, setUserProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.email) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Failed to load profile", error);
        return;
      }

      if (data && isMounted) {
        setUserProfile({
          firstName: data.first_name || "Utilisateur",
          lastName: data.last_name || "",
          email: user.user.email,
        });
      }
    }

    async function loadCategories() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, type")
        .order("name");

      if (error) {
        console.error("Failed to load categories", error);
        if (isMounted) {
          setActionError(
            "Impossible de charger les categories pour le moment.",
          );
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        setCategories((data ?? []) as Category[]);
        setIsLoading(false);
      }
    }

    void loadProfile();
    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const grouped = useMemo(() => {
    const expense = categories.filter((cat) => cat.type === "expense");
    const income = categories.filter((cat) => cat.type === "income");
    return { expense, income };
  }, [categories]);

  const formAccentClass =
    formType === "income"
      ? "focus:ring-emerald-500/40 focus:border-emerald-400"
      : "focus:ring-red-500/40 focus:border-red-400";
  const formSelectAccentClass =
    formType === "income"
      ? "border-emerald-500/40 bg-dark-elevated"
      : "border-red-500/40 bg-dark-elevated";

  async function handleAddCategory() {
    const trimmed = formName.trim();
    setFormError("");
    setActionError("");

    if (!trimmed) {
      setFormError("Nom de categorie requis");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        category.type === formType &&
        category.name.toLowerCase() === trimmed.toLowerCase(),
    );

    if (duplicate) {
      setFormError("Cette categorie existe deja");
      return;
    }

    setIsSaving(true);
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: trimmed,
        type: formType,
      })
      .select("id, name, type")
      .single();

    setIsSaving(false);

    if (error) {
      console.error("Failed to add category", error);
      setActionError("Impossible d'ajouter la categorie pour le moment.");
      return;
    }

    if (data) {
      setCategories((prev) =>
        [...prev, data as Category].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setFormName("");
      setFormType("expense");
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingType(category.type);
    setFormError("");
    setActionError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
    setEditingType("expense");
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    const trimmed = editingName.trim();

    if (!trimmed) {
      setFormError("Nom de categorie requis");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        category.id !== editingId &&
        category.type === editingType &&
        category.name.toLowerCase() === trimmed.toLowerCase(),
    );

    if (duplicate) {
      setFormError("Cette categorie existe deja");
      return;
    }

    setIsSaving(true);
    const { data, error } = await supabase
      .from("categories")
      .update({ name: trimmed, type: editingType })
      .eq("id", editingId)
      .select("id, name, type")
      .single();

    setIsSaving(false);

    if (error) {
      console.error("Failed to update category", error);
      setActionError("Impossible de modifier la categorie pour le moment.");
      return;
    }

    if (data) {
      setCategories((prev) =>
        prev
          .map((category) =>
            category.id === editingId ? (data as Category) : category,
          )
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      cancelEdit();
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    setActionError("");
    setIsSaving(true);

    const { error: txError } = await supabase
      .from("transactions")
      .delete()
      .eq("category_id", categoryId);

    if (txError) {
      setIsSaving(false);
      console.error("Failed to delete transactions for category", txError);
      setActionError(
        "Impossible de supprimer les transactions liees a cette categorie.",
      );
      return;
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    setIsSaving(false);

    if (error) {
      console.error("Failed to delete category", error);
      setActionError("Impossible de supprimer cette categorie.");
      return;
    }

    setCategories((prev) =>
      prev.filter((category) => category.id !== categoryId),
    );
    if (editingId === categoryId) {
      cancelEdit();
    }
  }

  function requestDelete(category: Category) {
    setPendingDelete(category);
  }

  function cancelDelete() {
    setPendingDelete(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const categoryId = pendingDelete.id;
    setPendingDelete(null);
    await handleDeleteCategory(categoryId);
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen w-full bg-dark">
      <Sidebar
        onLogout={onLogout}
        activeItem={activeItem}
        onNavigate={onNavigate}
        userProfile={userProfile}
      />

      <main className="lg:ml-64">
        <header className="sticky top-0 z-20 bg-dark/80 backdrop-blur-lg border-b border-dark-border">
          <div className="flex flex-col gap-3 px-6 py-4 lg:px-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="ml-12 lg:ml-0">
              <motion.h1
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.3,
                }}
                className="text-lg font-semibold text-white"
              >
                Categories
              </motion.h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CalendarIcon className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-xs text-gray-500 capitalize">{today}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="px-6 py-6 lg:px-8 lg:py-8 space-y-6">
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.4,
              delay: 0.1,
            }}
            className="bg-dark-card border border-dark-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Nouvelle categorie
                </h2>
                <p className="text-xs text-gray-500">
                  Ajoute une categorie de depense ou de revenu.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                <PlusIcon className="w-4 h-4" />
                <span>Ajout rapide</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="Ex: Animaux"
                  className={`w-full bg-dark-elevated border border-dark-border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 transition-colors ${formAccentClass}`}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Type
                </label>
                <select
                  value={formType}
                  onChange={(event) =>
                    setFormType(event.target.value as Category["type"])
                  }
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 transition-colors ${formSelectAccentClass} ${formAccentClass}`}
                >
                  <option value="expense">Depense</option>
                  <option value="income">Revenu</option>
                </select>
              </div>
            </div>

            {formError ? (
              <p className="mt-3 text-xs text-red-400">{formError}</p>
            ) : null}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleAddCategory()}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold text-dark text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-60"
              >
                <PlusIcon className="w-4 h-4" />
                Ajouter
              </button>
              {actionError ? (
                <span className="text-xs text-red-400">{actionError}</span>
              ) : null}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(
              [
                { label: "Depenses", data: grouped.expense },
                { label: "Revenus", data: grouped.income },
              ] as const
            ).map((group) => (
              <motion.div
                key={group.label}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.4,
                  delay: group.label === "Depenses" ? 0.2 : 0.3,
                }}
                className="bg-dark-card border border-dark-border rounded-xl"
              >
                <div className="px-5 py-4 border-b border-dark-border">
                  <h3
                    className={`text-sm font-semibold ${
                      group.label === "Revenus"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {group.label}
                  </h3>
                </div>
                <div className="divide-y divide-dark-border">
                  {isLoading ? (
                    <div className="px-5 py-4 text-sm text-gray-500">
                      Chargement...
                    </div>
                  ) : group.data.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-gray-500">
                      Aucune categorie pour le moment.
                    </div>
                  ) : (
                    group.data.map((category) => {
                      const isEditing = editingId === category.id;
                      return (
                        <div
                          key={category.id}
                          className="px-5 py-4 flex flex-col gap-3"
                        >
                          <div className="flex flex-wrap items-center gap-3 justify-between">
                            {isEditing ? (
                              <div className="flex-1 min-w-[200px] space-y-2">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(event) =>
                                    setEditingName(event.target.value)
                                  }
                                  className={`w-full bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 transition-colors ${
                                    editingType === "income"
                                      ? "focus:ring-emerald-500/40 focus:border-emerald-400"
                                      : "focus:ring-red-500/40 focus:border-red-400"
                                  }`}
                                />
                                <select
                                  value={editingType}
                                  onChange={(event) =>
                                    setEditingType(
                                      event.target.value as Category["type"],
                                    )
                                  }
                                  className={`w-full border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 transition-colors ${
                                    editingType === "income"
                                      ? "border-emerald-500/40 bg-dark-elevated focus:ring-emerald-500/40 focus:border-emerald-400"
                                      : "border-red-500/40 bg-dark-elevated focus:ring-red-500/40 focus:border-red-400"
                                  }`}
                                >
                                  <option value="expense">Depense</option>
                                  <option value="income">Revenu</option>
                                </select>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-semibold ${
                                    category.type === "income"
                                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                      : "bg-red-500/10 text-red-300 border-red-500/20"
                                  }`}
                                >
                                  {category.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-100">
                                    {category.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {category.type === "expense"
                                      ? "Depense"
                                      : "Revenu"}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void handleSaveEdit()}
                                    disabled={isSaving}
                                    className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 transition-colors disabled:opacity-60"
                                    aria-label="Sauvegarder"
                                  >
                                    <SaveIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="p-2 rounded-lg bg-dark-elevated text-gray-400 hover:text-white transition-colors"
                                    aria-label="Annuler"
                                  >
                                    <XIcon className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startEdit(category)}
                                  className="px-3 py-2 rounded-lg bg-dark-elevated text-xs font-semibold text-white border border-dark-border hover:bg-dark-hover transition-colors"
                                >
                                  Modifier
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => requestDelete(category)}
                                className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-dark-elevated transition-colors"
                                aria-label="Supprimer"
                              >
                                <Trash2Icon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {formError && isEditing ? (
                            <p className="text-xs text-red-400">{formError}</p>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
            }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={cancelDelete}
          />
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
              y: 8,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.96,
              y: 8,
            }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 30,
            }}
            className="relative w-full max-w-md bg-dark-card border border-dark-border rounded-2xl shadow-2xl z-10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
              <h2
                id="delete-category-title"
                className="text-lg font-semibold text-white"
              >
                Supprimer la categorie
              </h2>
              <button
                onClick={cancelDelete}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-hover transition-colors"
                aria-label="Fermer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-300">
                Tu es sur de vouloir supprimer la categorie
                <span className="text-white font-semibold">
                  {" "}
                  {pendingDelete.name}
                </span>
                ?
              </p>
              <p className="text-xs text-gray-500">
                Cette action est definitive. Toutes les transactions liees
                seront supprimees.
              </p>
              {actionError ? (
                <p className="text-xs text-red-400">{actionError}</p>
              ) : null}
            </div>
            <div className="px-6 pb-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 rounded-lg bg-dark-elevated text-sm font-semibold text-gray-200 hover:bg-dark-hover transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="px-4 py-2 rounded-lg bg-red-500/90 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
