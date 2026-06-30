"use client";
import TemplateSelectionModal from "@/components/modal/template-selector-modal";
import { Button } from "@/components/ui/button"
import { createPlayground } from "@/features/playground/actions";
import { Plus, ArrowRight } from 'lucide-react'
import { useRouter } from "next/navigation";
import { useState } from "react"
import { toast } from "sonner";

const AddNewButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<{
    title: string;
    template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
    description?: string;
  } | null>(null)
  const router = useRouter()

  const handleSubmit = async(data: {
    title: string;
    template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
    description?: string;
  }) => {
    setSelectedTemplate(data)
    const res = await createPlayground(data);
    toast("Playground created successfully");
    // Here you would typically handle the creation of a new playground
    // with the selected template data
    console.log("Creating new playground:", data)
    setIsModalOpen(false)
    router.push(`/playground/${res?.id}`)
  }

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="group flex cursor-pointer flex-row items-center justify-between rounded-xl border border-zinc-200 bg-white p-6 transition-all duration-200 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
      >
        <div className="flex flex-row items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-900 transition-colors group-hover:bg-zinc-900 group-hover:text-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:group-hover:bg-white dark:group-hover:text-zinc-900">
            <Plus
              size={20}
              className="transition-transform duration-300 group-hover:rotate-90"
            />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-semibold tracking-tight">Add New</h2>
            <p className="mt-0.5 max-w-[220px] text-sm text-zinc-500 dark:text-zinc-400">
              Create a new playground
            </p>
          </div>
        </div>

        <ArrowRight className="h-5 w-5 text-zinc-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-700 dark:group-hover:text-zinc-400" />
      </div>
      
      <TemplateSelectionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleSubmit}
      />
    </>
  )
}

export default AddNewButton
