import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AuthGuard, UserId } from "../auth.guard";
import { Roles, RolesGuard } from "../roles.guard";
import {
  GeminiKeyDto,
  GeminiModelDto,
  PaymentModeDto,
  RazorpayCredentialsDto,
} from "./configuration.dto";
import { ProviderConfigurationService } from "./configuration.service";

@Controller("admin/configuration")
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ConfigurationController {
  constructor(private readonly settings: ProviderConfigurationService) {}
  @Get() summary() {
    return this.settings.summary();
  }
  @Post("razorpay/:mode")
  @HttpCode(200)
  razorpay(
    @UserId() actor: string,
    @Param("mode") mode: string,
    @Body() input: RazorpayCredentialsDto,
  ) {
    return this.settings.saveRazorpay(actor, mode, input);
  }
  @Post("payment-mode")
  @HttpCode(200)
  mode(@UserId() actor: string, @Body() input: PaymentModeDto) {
    return this.settings.setPaymentMode(actor, input.mode);
  }
  @Post("gemini/keys")
  @HttpCode(200)
  add(@UserId() actor: string, @Body() input: GeminiKeyDto) {
    return this.settings.saveGemini(actor, null, input);
  }
  @Post("gemini/keys/:id")
  @HttpCode(200)
  update(
    @UserId() actor: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: GeminiKeyDto,
  ) {
    return this.settings.saveGemini(actor, id, input);
  }
  @Post("gemini/model")
  @HttpCode(200)
  model(@UserId() actor: string, @Body() input: GeminiModelDto) {
    return this.settings.saveModel(actor, input);
  }
}
