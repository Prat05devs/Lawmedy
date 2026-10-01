import {
  Controller,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { PaymentService } from "./payment.service";

@Controller("payments/razorpay")
export class PaymentWebhookController {
  constructor(private readonly payments: PaymentService) {}

  @Post("webhook")
  @HttpCode(200)
  webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers("x-razorpay-signature") signature?: string,
  ) {
    return this.payments.webhook(request.rawBody, signature);
  }
}
