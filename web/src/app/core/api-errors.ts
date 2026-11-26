import type { HttpErrorResponse } from "@angular/common/http";
import { GENERIC_ERROR_MESSAGE } from "./constants";
import type { ApiErrorBody, SaveFailure } from "./models";

export function readApiFailure(errorResponse: HttpErrorResponse): SaveFailure {
    const errorBody = errorResponse.error as ApiErrorBody | null;

    if (!errorBody) {
        return { message: GENERIC_ERROR_MESSAGE, compileErrors: [] };
    }

    const message = errorBody.message;
    const compileErrors = errorBody.errors;

    return {
        message: message ? message : GENERIC_ERROR_MESSAGE,
        compileErrors: compileErrors ? compileErrors : [],
    };
}
