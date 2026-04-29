"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const path_1 = require("path");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['log', 'error', 'warn', 'debug', 'verbose'],
        rawBody: true,
    });
    const configService = app.get(config_1.ConfigService);
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: [
                    "'self'",
                    'data:',
                    'https:',
                    'http://localhost:3002',
                    'http://localhost:3000',
                ],
                fontSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
    }));
    app.use((0, compression_1.default)({
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression_1.default.filter(req, res);
        },
        threshold: 1024,
    }));
    app.use('/uploads', (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        next();
    });
    app.useStaticAssets((0, path_1.join)(__dirname, '..', 'uploads'), {
        prefix: '/uploads/',
        maxAge: '1d',
        etag: true,
    });
    app.enableCors({
        origin: (origin, callback) => {
            const allowedOrigins = [
                configService.get('CORS_ORIGIN', 'http://localhost:3000'),
                'https://pos.truedesk.co.uk',
                'https://api.truedesk.co.uk',
                'https://truedesk.co.uk',
                'https://mainframe.truedesk.co.uk',
                'https://apimainframe.truedesk.co.uk',
                'https://pos.buymejewellery.co.uk',
                'https://buymejewellery.co.uk',
                'http://localhost:3000',
                'http://localhost:5173',
                'http://localhost:5174',
                'http://localhost:8080',
            ];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
        maxAge: 86400,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
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
            return new common_1.BadRequestException(result);
        },
    }));
    app.setGlobalPrefix('api/v1', {
        exclude: ['health', 'metrics'],
    });
    if (configService.get('NODE_ENV') !== 'production') {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('MPS Jewelry SaaS API')
            .setDescription('Secure Multi-Tenant Jewelry Point of Sale System API')
            .setVersion('1.0.0')
            .setContact('MPS Development Team', 'https://github.com/yourorg/mps-jewelry-saas', 'dev@mpsjewelry.com')
            .setLicense('MIT', 'https://opensource.org/licenses/MIT')
            .addBearerAuth({
            description: 'JWT Authorization header using the Bearer scheme',
            name: 'Authorization',
            bearerFormat: 'JWT',
            scheme: 'Bearer',
            type: 'http',
            in: 'Header',
        }, 'access-token')
            .addTag('Authentication', 'User authentication and authorization')
            .addTag('Customers', 'Customer management with GDPR compliance')
            .addTag('Products', 'Inventory and product management')
            .addTag('Sales', 'Point of sale transactions')
            .addTag('Repairs', 'Jewelry repair management')
            .addTag('Documents', 'Document and file management')
            .addTag('Reports', 'Business analytics and reporting')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
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
    const port = configService.get('PORT', 3002);
    await app.listen(port, '0.0.0.0');
    const environment = configService.get('NODE_ENV', 'development');
    logger.log(`🚀 MPS Jewelry SaaS API started successfully!`);
    logger.log(`🌐 Environment: ${environment}`);
    logger.log(`🔗 API Endpoint: http://localhost:${port}/api/v1`);
    logger.log(`📚 Documentation: http://localhost:${port}/api/docs`);
    if (environment === 'development') {
        logger.log('🔧 Development mode - Swagger docs available at /api/docs');
    }
}
bootstrap().catch((error) => {
    const logger = new common_1.Logger('Bootstrap');
    logger.error('❌ Failed to start MPS Jewelry SaaS API:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map