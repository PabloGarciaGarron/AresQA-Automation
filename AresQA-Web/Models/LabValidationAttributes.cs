using System.ComponentModel.DataAnnotations;
using AresQA.Services;

namespace AresQA.Models;

// These exceptions apply only when the current request uses the isolated bug database.
public sealed class PersonEmailAddressAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        var bugs = validationContext.GetService(typeof(BugModeContext)) as BugModeContext;
        return bugs?.IsEnabled(6) == true || new EmailAddressAttribute().IsValid(value)
            ? ValidationResult.Success
            : new ValidationResult(FormatErrorMessage(validationContext.DisplayName));
    }
}

public sealed class CompanyNitAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        var bugs = validationContext.GetService(typeof(BugModeContext)) as BugModeContext;
        var valid = bugs?.IsEnabled(13) == true
            ? value is null || value is string { Length: >= 5 and <= 15 }
            : new RegularExpressionAttribute(@"^[0-9]{5,15}$").IsValid(value);
        return valid ? ValidationResult.Success
            : new ValidationResult(FormatErrorMessage(validationContext.DisplayName));
    }
}
