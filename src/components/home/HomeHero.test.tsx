import { renderToStaticMarkup } from "react-dom/server";
import HomeHero from "./HomeHero";

jest.mock("next/link", () => {
  return function MockLink({ href, children, ...props }: React.ComponentProps<"a">) {
    return (
      <a href={typeof href === "string" ? href : "#"} {...props}>
        {children}
      </a>
    );
  };
});

describe("HomeHero", () => {
  it("muestra el gate y deshabilita el onboarding hasta aceptar consentimiento", () => {
    const html = renderToStaticMarkup(
      <HomeHero
        onUseChat={() => undefined}
        onUseExample={() => undefined}
        onStartOnboarding={() => undefined}
        consentRequired
        consentChecked={false}
      />
    );

    expect(html).toContain("He leído y acepto el tratamiento confidencial de mis datos");
    expect(html).toContain('href="/api/legal"');
    expect(html).toContain("disabled");
  });

  it("habilita el inicio cuando el consentimiento ya está marcado y muestra error si existe", () => {
    const html = renderToStaticMarkup(
      <HomeHero
        onUseChat={() => undefined}
        onUseExample={() => undefined}
        onStartOnboarding={() => undefined}
        consentRequired
        consentChecked
        consentError="Necesitamos tu consentimiento"
      />
    );

    expect(html).toContain("Empezar guiado");
    expect(html).not.toContain('<button type="button" disabled');
    expect(html).toContain("Necesitamos tu consentimiento");
  });
});
