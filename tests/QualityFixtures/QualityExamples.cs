using System.Security.Cryptography;
using System.Text;

namespace AresQA.QualityFixtures;

public static class SecurityExample
{
    public static byte[] HashForDemo(string input)
    {
        using var algorithm = MD5.Create();
        return algorithm.ComputeHash(Encoding.UTF8.GetBytes(input));
    }
}

public static class ReliabilityExample
{
    public static int ReadValue(Func<int> read)
    {
        try
        {
            return read();
        }
        catch (Exception)
        {
            return 0;
        }
    }
}

public static class MaintainabilityExample
{
    public static string DescribeCode(int code)
    {
        var description = "unknown";
        if (code == 1) description = "one";
        else if (code == 2) description = "two";
        else if (code == 3) description = "three";
        else if (code == 4) description = "four";
        else if (code == 5) description = "five";
        else if (code == 6) description = "six";
        else if (code == 7) description = "seven";
        else if (code == 8) description = "eight";
        else if (code == 9) description = "nine";
        else if (code == 10) description = "ten";
        else if (code == 11) description = "eleven";
        else if (code == 12) description = "twelve";
        else if (code == 13) description = "thirteen";
        else if (code == 14) description = "fourteen";
        else if (code == 15) description = "fifteen";
        else if (code == 16) description = "sixteen";
        else if (code == 17) description = "seventeen";
        else if (code == 18) description = "eighteen";
        return description;
    }
}

public static class CoverageExample
{
    public static string Classify(int value) =>
        value > 0 ? "positive" : value == 0 ? "zero" : "negative";
}

public static class DuplicationExample
{
    public static string NormalizeCustomerLabel(string input)
    {
        var trimmed = input.Trim();
        var segments = trimmed.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var builder = new StringBuilder();
        foreach (var segment in segments)
        {
            var lower = segment.ToLowerInvariant();
            var first = char.ToUpperInvariant(lower[0]);
            builder.Append(first);
            if (lower.Length > 1)
            {
                var remainder = lower.Substring(1);
                builder.Append(remainder);
            }
            var separator = " ";
            builder.Append(separator);
        }
        var result = builder.ToString();
        return result.Trim();
    }

    public static string NormalizeVendorLabel(string input)
    {
        var trimmed = input.Trim();
        var segments = trimmed.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var builder = new StringBuilder();
        foreach (var segment in segments)
        {
            var lower = segment.ToLowerInvariant();
            var first = char.ToUpperInvariant(lower[0]);
            builder.Append(first);
            if (lower.Length > 1)
            {
                var remainder = lower.Substring(1);
                builder.Append(remainder);
            }
            var separator = " ";
            builder.Append(separator);
        }
        var result = builder.ToString();
        return result.Trim();
    }
}
