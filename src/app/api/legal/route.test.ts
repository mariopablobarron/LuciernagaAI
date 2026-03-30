import { GET } from "./route";

describe("GET /api/legal", () => {
  it("expone disclaimers y recursos de crisis", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.disclaimers.length).toBeGreaterThan(0);
    expect(
      body.crisisResources.some((resource: { phone: string }) => resource.phone === "024")
    ).toBe(true);
    expect(
      body.crisisResources.some((resource: { phone: string }) => resource.phone === "988")
    ).toBe(true);
  });
});
