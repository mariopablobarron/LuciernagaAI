-- User tags (manual marketing segmentation) + Feedback testimonial flags

ALTER TABLE "User"
    ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "Feedback"
    ADD COLUMN "isPublicTestimonial" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "testimonialOrder" INTEGER;

CREATE INDEX "Feedback_isPublicTestimonial_testimonialOrder_idx"
    ON "Feedback"("isPublicTestimonial", "testimonialOrder");
