import { provideHttpClient, withFetch } from "@angular/common/http";
import { type ApplicationConfig, provideZonelessChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { APP_ROUTES } from "./app.routes";

export const APP_CONFIG: ApplicationConfig = {
    providers: [provideZonelessChangeDetection(), provideHttpClient(withFetch()), provideRouter(APP_ROUTES)],
};
