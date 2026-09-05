import type { RequestEditorForm } from "./request_form";
import {
    validate_justification,
    validate_legal_name,
    validate_spend,
    validate_website,
} from "./request_form_model";

function FieldError({ errors }: { errors: unknown[] }) {
    const message = errors.find((error) => typeof error === "string");
    return typeof message === "string" ? <span className="field-error">{message}</span> : null;
}

function LegalNameField({ form }: { form: RequestEditorForm }) {
    return (
        <form.Field
            name="vendor_legal_name"
            validators={{ onBlur: ({ value }) => validate_legal_name(value) }}
        >
            {(field) => (
                <label>
                    Vendor legal name
                    <input
                        maxLength={161}
                        onBlur={field.handleBlur}
                        value={field.state.value}
                        onChange={(event) => {
                            field.handleChange(event.target.value);
                        }}
                    />
                    <FieldError errors={field.state.meta.errors} />
                </label>
            )}
        </form.Field>
    );
}

function WebsiteField({ form }: { form: RequestEditorForm }) {
    return (
        <form.Field
            name="vendor_website"
            validators={{ onBlur: ({ value }) => validate_website(value) }}
        >
            {(field) => (
                <label>
                    Vendor website
                    <input
                        placeholder="https://vendor.example"
                        type="url"
                        onBlur={field.handleBlur}
                        value={field.state.value}
                        onChange={(event) => {
                            field.handleChange(event.target.value);
                        }}
                    />
                    <FieldError errors={field.state.meta.errors} />
                </label>
            )}
        </form.Field>
    );
}

function CategoryField({ form }: { form: RequestEditorForm }) {
    return (
        <form.Field name="service_category">
            {(field) => (
                <label>
                    Service category
                    <select
                        value={field.state.value}
                        onChange={(event) => {
                            field.handleChange(event.target.value);
                        }}
                    >
                        <option value="">Not selected</option>
                        <option value="software">Software</option>
                        <option value="professional_services">Professional services</option>
                        <option value="facilities">Facilities</option>
                        <option value="logistics">Logistics</option>
                        <option value="other">Other</option>
                    </select>
                </label>
            )}
        </form.Field>
    );
}

function JustificationField({ form }: { form: RequestEditorForm }) {
    return (
        <form.Field
            name="business_justification"
            validators={{ onBlur: ({ value }) => validate_justification(value) }}
        >
            {(field) => (
                <label className="full-field">
                    Business justification
                    <textarea
                        maxLength={2001}
                        rows={5}
                        onBlur={field.handleBlur}
                        value={field.state.value}
                        onChange={(event) => {
                            field.handleChange(event.target.value);
                        }}
                    />
                    <FieldError errors={field.state.meta.errors} />
                </label>
            )}
        </form.Field>
    );
}

function SpendField({ form }: { form: RequestEditorForm }) {
    return (
        <form.Field
            name="annual_spend_minor_units"
            validators={{ onBlur: ({ value }) => validate_spend(value) }}
        >
            {(field) => (
                <label>
                    Expected annual spend (cents)
                    <input
                        inputMode="numeric"
                        onBlur={field.handleBlur}
                        value={field.state.value}
                        onChange={(event) => {
                            field.handleChange(event.target.value);
                        }}
                    />
                    <FieldError errors={field.state.meta.errors} />
                </label>
            )}
        </form.Field>
    );
}

function CurrencyField({ form }: { form: RequestEditorForm }) {
    return (
        <form.Field name="currency_code">
            {(field) => (
                <label>
                    Currency
                    <select
                        value={field.state.value}
                        onChange={(event) => {
                            field.handleChange(event.target.value);
                        }}
                    >
                        <option value="USD">USD</option>
                    </select>
                </label>
            )}
        </form.Field>
    );
}

function RiskFields({ form }: { form: RequestEditorForm }) {
    return (
        <>
            <form.Field name="receives_confidential_data">
                {(field) => (
                    <label>
                        Receives confidential data?
                        <select
                            value={field.state.value}
                            onChange={(event) => {
                                field.handleChange(event.target.value);
                            }}
                        >
                            <option value="">Not answered</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </label>
                )}
            </form.Field>
            <form.Field name="supports_critical_process">
                {(field) => (
                    <label>
                        Supports a critical process?
                        <select
                            value={field.state.value}
                            onChange={(event) => {
                                field.handleChange(event.target.value);
                            }}
                        >
                            <option value="">Not answered</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </label>
                )}
            </form.Field>
        </>
    );
}

export function RequestFields({ form }: { form: RequestEditorForm }) {
    return (
        <>
            <LegalNameField form={form} />
            <WebsiteField form={form} />
            <CategoryField form={form} />
            <JustificationField form={form} />
            <SpendField form={form} />
            <CurrencyField form={form} />
            <RiskFields form={form} />
        </>
    );
}
