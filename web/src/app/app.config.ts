import { type ApplicationConfig, provideZonelessChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { APP_ROUTES } from "./app.routes";

export const APP_CONFIG: ApplicationConfig = {
    providers: [provideZonelessChangeDetection(), provideRouter(APP_ROUTES)],
};
