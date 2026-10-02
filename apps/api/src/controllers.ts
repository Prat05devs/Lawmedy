import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { AuthGuard, UserId } from "./auth.guard";
import {
  CreateMatterDto,
  LoginDto,
  SignupDto,
  StatementDto,
  IntakeAnswersDto,
  ConfirmReviewDto,
  AdvocateResponseDto,
  RtiDetailDto,
  PaymentVerifyDto,
  ManualPaymentDto,
  GoogleLoginDto,
} from "./dto";
import { MattersService } from "./matters.service";
import { IntakeService } from "./intake/intake.service";
import { ReviewService } from "./review/review.service";
import { PaymentService } from "./payment/payment.service";
import { DocumentsService } from "./documents/documents.service";
import { AdvocateService } from "./advocate/advocate.service";
import { RtiService } from "./rti/rti.service";

@Controller("auth")
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post("signup") signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }
  @Post("google") @HttpCode(200) google(@Body() dto: GoogleLoginDto) {
    return this.auth.google(dto.idToken);
  }
  @Post("login") @HttpCode(200) login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}
@Controller("users")
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    private readonly auth: AuthService,
    private readonly advocates: AdvocateService,
  ) {}
  @Get("me") me(@UserId() userId: string) {
    return this.auth.me(userId);
  }
  @Get("notifications") notifications(@UserId() userId: string) {
    return this.advocates.notifications(userId);
  }
}
@Controller("matters")
@UseGuards(AuthGuard)
export class MattersController {
  constructor(
    private readonly matters: MattersService,
    private readonly intake: IntakeService,
    private readonly review: ReviewService,
    private readonly payment: PaymentService,
    private readonly documents: DocumentsService,
    private readonly advocates: AdvocateService,
    private readonly rti: RtiService,
  ) {}
  @Post() create(@UserId() uid: string, @Body() dto: CreateMatterDto) {
    return this.matters.create(uid, dto.type);
  }
  @Get() list(@UserId() uid: string) {
    return this.matters.list(uid);
  }
  @Get("rti/public-authorities")
  publicAuthorities() {
    return this.rti.authorities();
  }
  @Get(":id") get(
    @UserId() uid: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.matters.get(uid, id);
  }
  @Post(":id/statement") async statement(
    @UserId() uid: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: StatementDto,
  ) {
    const saved = await this.matters.saveStatement(uid, id, dto.statement);
    const matter = await this.matters.get(uid, id);
    await this.intake.analyze(uid, id, saved.id);
    return saved;
  }
  @Get(":id/rti-details")
  rtiDetails(@UserId() uid: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.rti.get(uid, id);
  }
  @Post(":id/rti-details")
  @HttpCode(200)
  saveRtiDetails(@UserId() uid: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: RtiDetailDto) {
    return this.rti.save(uid, id, dto);
  }
  @Get(":id/intake") getIntake(
    @UserId() uid: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.intake.get(uid, id);
  }
  @Post(":id/intake/retry")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  retryIntake(@UserId() uid: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.intake.analyze(uid, id);
  }
  @Post(":id/answers")
  @HttpCode(200)
  answers(
    @UserId() uid: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: IntakeAnswersDto,
  ) {
    return this.intake.answer(uid, id, dto.analysisId, dto.answers);
  }
  @Get(":id/review")
  reviewDetails(@UserId() uid: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.review.get(uid, id);
  }
  @Post(":id/review/prepare")
  @HttpCode(200)
  prepareReview(@UserId() uid: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.review.prepare(uid, id);
  }
  @Post(":id/review/confirm")
  @HttpCode(200)
  confirmReview(
    @UserId() uid: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ConfirmReviewDto,
  ) {
    return this.review.confirm(uid, id, dto);
  }
  @Post(":id/payment/order")
  @HttpCode(200)
  createPaymentOrder(
    @UserId() uid: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.payment.createOrder(uid, id);
  }
  @Post(":id/payment/manual")
  @HttpCode(200)
  submitManualPayment(
    @UserId() uid: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ManualPaymentDto,
  ) {
    return this.payment.submitManual(uid, id, dto.reference);
  }
  @Post(":id/payment/verify")
  @HttpCode(200)
  verifyPayment(
    @UserId() uid: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PaymentVerifyDto,
  ) {
    return this.payment.verifyCheckout(uid, id, dto);
  }
  @Get(":id/document")
  document(@UserId() uid: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.documents.get(uid, id);
  }
  @Post(":id/document/retry")
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  retryDocument(
    @UserId() uid: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.documents.retry(uid, id);
  }
  @Get(":id/advocate-requests")
  advocateRequests(
    @UserId() uid: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.advocates.requestsForUser(uid, id);
  }
  @Post(":id/advocate-response")
  @HttpCode(200)
  advocateResponse(
    @UserId() uid: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AdvocateResponseDto,
  ) {
    return this.advocates.respond(uid, id, dto);
  }
}
