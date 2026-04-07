import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WebappAuthDto } from './dto/webapp-auth.dto';
import { WebappCreateSubscriptionDto } from './dto/webapp-create-subscription.dto';
import { WebappAuthenticatedRequest } from './interfaces/webapp-authenticated-request.interface';
import { WebappAuthGuard } from './guards/webapp-auth.guard';
import { WebappAuthService } from './webapp-auth.service';
import { WebappService } from './webapp.service';

@Controller('webapp')
export class WebappController {
  constructor(
    private readonly webappAuthService: WebappAuthService,
    private readonly webappService: WebappService,
  ) {}

  @Post('auth')
  async authenticate(@Body() dto: WebappAuthDto) {
    const session = await this.webappAuthService.authenticate(dto.initData);
    const dashboard = await this.webappService.getDashboard(
      BigInt(session.user.id),
    );

    return {
      accessToken: session.accessToken,
      user: session.user,
      profile: dashboard.profile,
    };
  }

  @UseGuards(WebappAuthGuard)
  @Get('dashboard')
  async getDashboard(@Req() request: WebappAuthenticatedRequest) {
    const telegramId = BigInt(request.webappUser.telegramId);
    const dashboard = await this.webappService.getDashboard(telegramId);

    return {
      user: {
        id: Number(request.webappUser.telegramId),
        username: request.webappUser.username ?? undefined,
        first_name: request.webappUser.firstName ?? request.webappUser.username ?? 'Dealer',
        last_name: request.webappUser.lastName ?? undefined,
      },
      profile: dashboard.profile,
      stats: dashboard.stats,
    };
  }

  @UseGuards(WebappAuthGuard)
  @Get('profile')
  getProfile(@Req() request: WebappAuthenticatedRequest) {
    return this.webappService.getProfile(BigInt(request.webappUser.telegramId));
  }

  @UseGuards(WebappAuthGuard)
  @Get('subscriptions')
  listSubscriptions(
    @Req() request: WebappAuthenticatedRequest,
    @Query('page') page?: string,
  ) {
    const parsedPage = Number(page ?? 1);
    return this.webappService.listSubscriptions(
      BigInt(request.webappUser.telegramId),
      Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    );
  }

  @UseGuards(WebappAuthGuard)
  @Get('subscriptions/:id')
  getSubscription(
    @Req() request: WebappAuthenticatedRequest,
    @Param('id') subscriptionId: string,
  ) {
    return this.webappService.getSubscription(
      BigInt(request.webappUser.telegramId),
      subscriptionId,
    );
  }

  @UseGuards(WebappAuthGuard)
  @Post('subscriptions')
  createSubscription(
    @Req() request: WebappAuthenticatedRequest,
    @Body() dto: WebappCreateSubscriptionDto,
  ) {
    return this.webappService.createSubscription(
      BigInt(request.webappUser.telegramId),
      dto,
    );
  }

  @UseGuards(WebappAuthGuard)
  @Post('subscriptions/:id/pause')
  pauseSubscription(
    @Req() request: WebappAuthenticatedRequest,
    @Param('id') subscriptionId: string,
  ) {
    return this.webappService.pauseSubscription(
      BigInt(request.webappUser.telegramId),
      subscriptionId,
    );
  }

  @UseGuards(WebappAuthGuard)
  @Post('subscriptions/:id/resume')
  resumeSubscription(
    @Req() request: WebappAuthenticatedRequest,
    @Param('id') subscriptionId: string,
  ) {
    return this.webappService.resumeSubscription(
      BigInt(request.webappUser.telegramId),
      subscriptionId,
    );
  }

  @UseGuards(WebappAuthGuard)
  @Delete('subscriptions/:id')
  deleteSubscription(
    @Req() request: WebappAuthenticatedRequest,
    @Param('id') subscriptionId: string,
  ) {
    return this.webappService.deleteSubscription(
      BigInt(request.webappUser.telegramId),
      subscriptionId,
    );
  }
}
