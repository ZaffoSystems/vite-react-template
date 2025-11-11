import { Context } from "hono";

export class AIGatewayService {
  private readonly gatewayId: string;
  private readonly gatewayToken: string;
  private readonly baseUrl = "https://gateway.ai.cloudflare.com/v1";

  constructor(env: any) {
    this.gatewayId = env.CF_GATEWAY_ID;
    this.gatewayToken = env.CF_GATEWAY_AUTH_TOKEN;
    console.log("AI Gateway Service initialized:", {
      gatewayId: this.gatewayId,
      hasToken: !!this.gatewayToken,
    });
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.gatewayToken}`,
      "Content-Type": "application/json",
    };
  }

  async listModels() {
    // Note: The AI Gateway API doesn't currently support listing models.
    // This is a placeholder for future functionality.
    return [
      { id: "@cf/meta/llama-2-7b-chat-fp16", name: "Llama 2 7B Chat (FP16)" },
      {
        id: "@cf/mistral/mistral-7b-instruct-v0.1",
        name: "Mistral 7B Instruct",
      },
    ];
  }

  async requestModel(model: string, inputs: any) {
    if (!this.gatewayId || !this.gatewayToken) {
      throw new Error("AI Gateway credentials not configured in .env");
    }
    const response = await fetch(`${this.baseUrl}/${this.gatewayId}/${model}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(inputs),
    });

    if (!response.ok) {
      throw new Error(`Failed to request AI model: ${response.statusText}`);
    }

    return response.json();
  }
}

export async function initializeAIGatewayService(
  c: Context,
  next: () => Promise<void>,
) {
  const service = new AIGatewayService(c.env || process.env);
  c.set("aiGatewayService", service);
  await next();
}
