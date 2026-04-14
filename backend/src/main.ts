import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // ===================================
  // SECURITY MIDDLEWARE
  // ===================================

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: [
            "'self'",
            'data:',
            'https:',
            configService.get('SERVER_BASE_URL', 'http://localhost:3002'),
            'http://localhost:3002',
            'http://localhost:3000',
          ],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resource loading
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Compression middleware
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024,
    }),
  );

  // ===================================
  // STATIC FILE SERVING
  // ===================================

  // Add CORS headers for static files
  app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    maxAge: '1d',
    etag: true,
  });

  // ===================================
  // CORS CONFIGURATION
  // ===================================

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowedOrigins = [
        configService.get('CORS_ORIGIN', 'http://localhost:3000'),
        // Production domains
        'https://pos.truedesk.co.uk',
        'https://api.truedesk.co.uk',
        'https://truedesk.co.uk',
        // Legacy domains
        'https://pos.buymejewellery.co.uk',
        'https://buymejewellery.co.uk',
        // Local development
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:8080',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  // ===================================
  // VALIDATION & TRANSFORMATION
  // ===================================

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          property: error.property,
          value: error.value,
          constraints: error.constraints,
        }));
        return new BadRequestException(result);
      },
    }),
  );

  // ===================================
  // API CONFIGURATION
  // ===================================

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'metrics'],
  });

  // ===================================
  // SWAGGER DOCUMENTATION
  // ===================================

  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MPS Jewelry SaaS API')
      .setDescription('Secure Multi-Tenant Jewelry Point of Sale System API')
      .setVersion('1.0.0')
      .setContact(
        'MPS Development Team',
        'https://github.com/yourorg/mps-jewelry-saas',
        'dev@mpsjewelry.com',
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addBearerAuth(
        {
          description: 'JWT Authorization header using the Bearer scheme',
          name: 'Authorization',
          bearerFormat: 'JWT',
          scheme: 'Bearer',
          type: 'http',
          in: 'Header',
        },
        'access-token',
      )
      .addTag('Authentication', 'User authentication and authorization')
      .addTag('Customers', 'Customer management with GDPR compliance')
      .addTag('Products', 'Inventory and product management')
      .addTag('Sales', 'Point of sale transactions')
      .addTag('Repairs', 'Jewelry repair management')
      .addTag('Documents', 'Document and file management')
      .addTag('Reports', 'Business analytics and reporting')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
      },
      customSiteTitle: 'MPS Jewelry SaaS API Documentation',
      customfavIcon: '/favicon.ico',
    });
  }

  // ===================================
  // APPLICATION STARTUP
  // ===================================

  const port = configService.get('PORT', 3002);
  await app.listen(port, '0.0.0.0');

  const environment = configService.get('NODE_ENV', 'development');

  console.log(`
🚀 MPS Jewelry SaaS API started successfully!
🌐 Environment: ${environment}
🔗 API Endpoint: http://localhost:${port}/api/v1
📚 Documentation: http://localhost:${port}/api/docs
🔒 Security: Helmet + CORS + Rate Limiting enabled
🛡️  Validation: Global validation pipes active
🗄️  Database: PostgreSQL with Prisma ORM
📁 File Storage: Google Drive integration ready
`);

  if (environment === 'development') {
    console.log('🔧 Development mode - Swagger docs available at /api/docs');
  }
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start MPS Jewelry SaaS API:', error);
  process.exit(1);
});
