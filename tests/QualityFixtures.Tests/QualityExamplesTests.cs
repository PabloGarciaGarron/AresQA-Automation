using AresQA.QualityFixtures;
using Xunit;

namespace AresQA.QualityFixtures.Tests;

public sealed class QualityExamplesTests
{
    [Fact]
    public void Classify_returns_positive_for_positive_input()
    {
        Assert.Equal("positive", CoverageExample.Classify(1));
    }
}
