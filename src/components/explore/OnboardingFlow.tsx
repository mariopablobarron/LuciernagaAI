"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export type OnboardingData = {
  name: string;
  situation: string;
  goal: string;
  urgency: "today" | "week" | "month";
};

type OnboardingFlowProps = {
  onComplete: (data: OnboardingData) => void;
};

const STEPS = [
  {
    id: "name",
    title: "¿Cuál es tu nombre?",
    subtitle: "Para personalizarte la experiencia",
    icon: "👤",
  },
  {
    id: "situation",
    title: "¿Qué te trae aquí?",
    subtitle: "Describe honestamente lo que te bloquea o te duele",
    icon: "🎯",
  },
  {
    id: "goal",
    title: "¿Cuál es tu siguiente paso ideal?",
    subtitle: "No tiene que ser perfecto, solo concreto",
    icon: "🚀",
  },
  {
    id: "urgency",
    title: "¿Cuándo necesitas hacerlo?",
    subtitle: "Eso marca qué tan urgente es",
    icon: "⏰",
  },
];

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    situation: "",
    goal: "",
    urgency: "week",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleInputChange = (
    field: keyof OnboardingData,
    value: string | "today" | "week" | "month"
  ) => {
    setData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNext = async () => {
    if (isLastStep) {
      setIsSubmitting(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsSubmitting(false);
      onComplete(data);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const getInputField = () => {
    switch (step.id) {
      case "name":
        return (
          <Input
            type="text"
            placeholder="Tu nombre..."
            value={data.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="text-lg py-3"
            autoFocus
          />
        );

      case "situation":
        return (
          <Textarea
            placeholder="Llevo tiempo evitando... porque siento que..."
            value={data.situation}
            onChange={(e) => handleInputChange("situation", e.target.value)}
            className="min-h-32 resize-none text-base"
            autoFocus
          />
        );

      case "goal":
        return (
          <Textarea
            placeholder="Mi siguiente paso sería... porque..."
            value={data.goal}
            onChange={(e) => handleInputChange("goal", e.target.value)}
            className="min-h-32 resize-none text-base"
            autoFocus
          />
        );

      case "urgency":
        return (
          <div className="space-y-3">
            {(["today", "week", "month"] as const).map((option) => (
              <button
                key={option}
                onClick={() => handleInputChange("urgency", option)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  data.urgency === option
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="font-medium text-foreground capitalize">
                  {option === "today" && "Hoy"}
                  {option === "week" && "Esta semana"}
                  {option === "month" && "Este mes"}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {option === "today" &&
                    "Necesito hacerlo ahora mismo"}
                  {option === "week" &&
                    "Es una prioridad cercana"}
                  {option === "month" &&
                    "Puedo esperar un poco"}
                </p>
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (step.id) {
      case "name":
        return data.name.trim().length > 0;
      case "situation":
        return data.situation.trim().length > 10;
      case "goal":
        return data.goal.trim().length > 10;
      case "urgency":
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="onboarding-flow relative h-full w-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      {/* Decorative circles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-border/20 opacity-50" />
      </div>

      {/* Main container */}
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Progress indicator */}
        <div className="space-y-3">
          <div className="flex gap-2">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-all ${
                  index <= currentStep ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Paso {currentStep + 1} de {STEPS.length}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 space-y-6 animate-in fade-in duration-300">
          {/* Step header */}
          <div className="space-y-3 text-center">
            <div className="text-4xl">{step.icon}</div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                {step.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {step.subtitle}
              </p>
            </div>
          </div>

          {/* Input */}
          <div className="min-h-[120px]">{getInputField()}</div>

          {/* Microcopy */}
          <p className="text-xs text-muted-foreground text-center">
            {currentStep === 0 &&
              "No tiene que ser tu nombre completo, lo que prefieras"}
            {currentStep === 1 &&
              "Sé honesto. Esto es solo para ti."}
            {currentStep === 2 &&
              "Uno pequeño. Concreto. Alcanzable."}
            {currentStep === 3 &&
              "Eso va a centrar tu exploración aquí"}
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleBack}
              disabled={isFirstStep || isSubmitting}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleNext}
              disabled={!isStepValid() || isSubmitting}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity font-medium flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                  Preparando...
                </>
              ) : isLastStep ? (
                <>
                  Comenzar
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Reassurance message */}
        <p className="text-xs text-muted-foreground text-center">
          Tu información es privada y se usa solo para personalizar tu experiencia
        </p>
      </div>
    </div>
  );
}
