import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDeleteDialog, DrawerForm } from "../../components/ui/dialogs";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField, Input, Select, Switch, Textarea } from "../../components/ui/field";
import { MediaField } from "../../components/ui/media-field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { apiRequest } from "../../lib/api-client";
import type { PublicationStatus, RatingSummary, Testimonial } from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import { optionalUrlField } from "../../lib/form-schemas";
import {
  publicationActionLabel,
  publicationStatusClassName,
  publicationStatusLabel,
  togglePublicationStatus
} from "../../lib/publication-status";
import { queryKeys } from "../../lib/query-keys";
import { canWriteContent } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const ratingSummarySchema = z.object({
  score: z.string().trim().min(1),
  reviewCount: z.string().trim().min(1),
  starCount: z.coerce.number().int().min(1).max(5)
});

const testimonialSchema = z.object({
  quote: z.string().trim().min(1),
  author: z.string().trim().min(1),
  title: z.string().trim().min(1),
  avatar: optionalUrlField,
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  isActive: z.boolean(),
  publicationStatus: z.enum(["draft", "published"])
});

type RatingSummaryValues = z.infer<typeof ratingSummarySchema>;
type TestimonialValues = z.infer<typeof testimonialSchema>;

export function TestimonialsPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [editorState, setEditorState] = useState<{
    open: boolean;
    testimonial: Testimonial | null;
  }>({ open: false, testimonial: null });
  const [deleteId, setDeleteId] = useState<string>();

  const testimonialsQuery = useQuery({
    queryKey: queryKeys.testimonials,
    queryFn: () => apiRequest<Testimonial[]>("/api/admin/testimonials")
  });
  const ratingSummaryQuery = useQuery({
    queryKey: queryKeys.ratingSummary,
    queryFn: () => apiRequest<RatingSummary>("/api/admin/rating-summary")
  });

  const ratingForm = useForm<RatingSummaryValues>({
    resolver: zodResolver(ratingSummarySchema),
    defaultValues: {
      score: "",
      reviewCount: "",
      starCount: 5
    }
  });
  const testimonialForm = useForm<TestimonialValues>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      quote: "",
      author: "",
      title: "",
      avatar: "",
      rating: 5,
      isActive: true,
      publicationStatus: "draft"
    }
  });

  useEffect(() => {
    if (ratingSummaryQuery.data) {
      ratingForm.reset({
        score: ratingSummaryQuery.data.score,
        reviewCount: ratingSummaryQuery.data.reviewCount,
        starCount: ratingSummaryQuery.data.starCount
      });
    }
  }, [ratingSummaryQuery.data, ratingForm]);

  const testimonials = [...(testimonialsQuery.data ?? [])].sort(
    (left, right) => left.sortOrder - right.sortOrder
  );

  const ratingMutation = useMutation({
    mutationFn: (values: RatingSummaryValues) =>
      apiRequest<RatingSummary>("/api/admin/rating-summary", {
        method: "PUT",
        csrfToken,
        body: values
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.ratingSummary });
      pushToast("Rating summary saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const testimonialMutation = useMutation({
    mutationFn: (values: TestimonialValues) => {
      if (editorState.testimonial) {
        return apiRequest<Testimonial>(`/api/admin/testimonials/${editorState.testimonial.id}`, {
          method: "PUT",
          csrfToken,
          body: {
            ...values,
            avatar: values.avatar || undefined,
            sortOrder: editorState.testimonial.sortOrder
          }
        });
      }

      return apiRequest<Testimonial>("/api/admin/testimonials", {
        method: "POST",
        csrfToken,
        body: {
          ...values,
          avatar: values.avatar || undefined,
          sortOrder: testimonials.length
        }
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, testimonial: null });
      testimonialForm.reset({
        quote: "",
        author: "",
        title: "",
        avatar: "",
        rating: 5,
        isActive: true,
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.testimonials });
      pushToast("Testimonial saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const reorderMutation = useMutation({
    mutationFn: (nextItems: Testimonial[]) =>
      apiRequest<{ success: boolean }>("/api/admin/testimonials/reorder", {
        method: "PATCH",
        csrfToken,
        body: nextItems.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.testimonials });
      pushToast("Testimonials reordered");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/api/admin/testimonials/${deleteId}`, {
        method: "DELETE",
        csrfToken
      }),
    onSuccess: async () => {
      setDeleteId(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.testimonials });
      pushToast("Testimonial deleted");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const publicationMutation = useMutation({
    mutationFn: ({
      id,
      publicationStatus
    }: {
      id: string;
      publicationStatus: PublicationStatus;
    }) =>
      apiRequest<Testimonial>(`/api/admin/testimonials/${id}/publication-status`, {
        method: "PATCH",
        csrfToken,
        body: { publicationStatus }
      }),
    onSuccess: async (_testimonial, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.testimonials });
      pushToast(
        variables.publicationStatus === "published"
          ? "Testimonial published"
          : "Testimonial moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openEditor(testimonial?: Testimonial) {
    setEditorState({
      open: true,
      testimonial: testimonial ?? null
    });
    testimonialForm.reset({
      quote: testimonial?.quote ?? "",
      author: testimonial?.author ?? "",
      title: testimonial?.title ?? "",
      avatar: testimonial?.avatar ?? "",
      rating: testimonial?.rating ?? 5,
      isActive: testimonial?.isActive ?? true,
      publicationStatus: testimonial?.publicationStatus ?? "draft"
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testimonials"
        description="Manage social proof copy and the review summary displayed above the carousel."
        actions={
          canEdit ? (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4" />
              Add testimonial
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      <Card>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
              Rating summary
            </div>
            <div className="text-sm text-[color:var(--dd-muted)]">
              This singleton drives the compact trust header above testimonials.
            </div>
          </div>
          {canEdit ? (
            <Button
              onClick={ratingForm.handleSubmit((values) => ratingMutation.mutate(values))}
              disabled={ratingMutation.isPending}
            >
              {ratingMutation.isPending ? "Saving..." : "Save summary"}
            </Button>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Score" error={ratingForm.formState.errors.score?.message}>
            <Input {...ratingForm.register("score")} disabled={!canEdit} />
          </FormField>
          <FormField
            label="Review count"
            error={ratingForm.formState.errors.reviewCount?.message}
          >
            <Input {...ratingForm.register("reviewCount")} disabled={!canEdit} />
          </FormField>
          <FormField
            label="Stars"
            error={ratingForm.formState.errors.starCount?.message}
          >
            <Input type="number" min={1} max={5} {...ratingForm.register("starCount")} disabled={!canEdit} />
          </FormField>
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="space-y-1">
          <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
            Testimonial entries
          </div>
          <div className="text-sm text-[color:var(--dd-muted)]">
            Reorder cards exactly as they should appear publicly.
          </div>
        </div>
        {testimonials.length === 0 ? (
          <EmptyState
            title="No testimonials yet"
            description="Create the first testimonial to start building the carousel."
          />
        ) : (
          <SortableList
            items={testimonials}
            onReorder={(nextItems) => {
              queryClient.setQueryData(
                queryKeys.testimonials,
                nextItems.map((item, index) => ({ ...item, sortOrder: index }))
              );
              reorderMutation.mutate(nextItems);
            }}
            renderItem={(testimonial) => (
              <div className="space-y-3">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-semibold text-[color:var(--dd-text)]">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-[color:var(--dd-muted)]">
                      {testimonial.title}
                    </div>
                    <div className="mt-3 text-sm text-[color:var(--dd-text)]">
                      {testimonial.quote}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
                      {testimonial.isActive ? "Active" : "Hidden"}
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(testimonial.publicationStatus)}`}
                    >
                      {publicationStatusLabel(testimonial.publicationStatus)}
                    </div>
                  </div>
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => openEditor(testimonial)}>
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        publicationMutation.mutate({
                          id: testimonial.id,
                          publicationStatus: togglePublicationStatus(
                            testimonial.publicationStatus
                          )
                        })
                      }
                      disabled={publicationMutation.isPending}
                    >
                      {publicationActionLabel(testimonial.publicationStatus)}
                    </Button>
                    <Button variant="ghost" onClick={() => setDeleteId(testimonial.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          />
        )}
      </Card>
      <DrawerForm
        open={editorState.open}
        onOpenChange={(open) => setEditorState((current) => ({ ...current, open }))}
        title={editorState.testimonial ? "Edit testimonial" : "Create testimonial"}
      >
        <form className="space-y-5" onSubmit={testimonialForm.handleSubmit((values) => testimonialMutation.mutate(values))}>
          <FormField label="Quote" error={testimonialForm.formState.errors.quote?.message}>
            <Textarea {...testimonialForm.register("quote")} />
          </FormField>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Author" error={testimonialForm.formState.errors.author?.message}>
              <Input {...testimonialForm.register("author")} />
            </FormField>
            <FormField label="Title" error={testimonialForm.formState.errors.title?.message}>
              <Input {...testimonialForm.register("title")} />
            </FormField>
          </div>
          <FormField label="Star rating" error={testimonialForm.formState.errors.rating?.message}>
            <Input type="number" min={1} max={5} {...testimonialForm.register("rating")} />
          </FormField>
          <MediaField
            label="Avatar"
            value={testimonialForm.watch("avatar") ?? ""}
            onChange={(nextValue) => testimonialForm.setValue("avatar", nextValue)}
            kind="image"
          />
          <FormField
            label="Publication status"
            hint="Draft testimonials stay in the CMS but are excluded from the public site."
            error={testimonialForm.formState.errors.publicationStatus?.message}
          >
            <Select {...testimonialForm.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--dd-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-[color:var(--dd-text)]">Visible on site</div>
              <div className="text-sm text-[color:var(--dd-muted)]">Toggle the testimonial without deleting it.</div>
            </div>
            <Switch
              checked={testimonialForm.watch("isActive")}
              onCheckedChange={(nextValue) => testimonialForm.setValue("isActive", nextValue)}
            />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, testimonial: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={testimonialMutation.isPending}>
              {testimonialMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DrawerForm>
      <ConfirmDeleteDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(undefined);
          }
        }}
        onConfirm={() => deleteMutation.mutate()}
        busy={deleteMutation.isPending}
        title="Delete testimonial"
        description="This permanently removes the testimonial entry."
      />
    </div>
  );
}
