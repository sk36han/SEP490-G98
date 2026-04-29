using FluentAssertions;
using Warehouse.DataAcces.Service;

namespace WarehouseTests.Infrastructure;

public class DateTimeProviderTests
{
    [Fact]
    public void BusinessDate_ShouldBeStableAcrossServerTimezone_ForBoundaryUtcMoments()
    {
        var provider = new DateTimeProvider("Asia/Ho_Chi_Minh", () => new DateTime(2026, 4, 28, 0, 0, 0, DateTimeKind.Utc));

        var beforeMidnightUtc = new DateTime(2026, 4, 27, 16, 30, 0, DateTimeKind.Utc); // 23:30 VN
        var afterMidnightUtc = new DateTime(2026, 4, 27, 17, 30, 0, DateTimeKind.Utc);  // 00:30 VN

        provider.ToBusinessDate(beforeMidnightUtc).Should().Be(new DateOnly(2026, 4, 27));
        provider.ToBusinessDate(afterMidnightUtc).Should().Be(new DateOnly(2026, 4, 28));
    }

    [Fact]
    public void BusinessNow_ShouldUseConfiguredTimezone_NotServerLocalTimezone()
    {
        var fixedUtcNow = new DateTime(2026, 4, 27, 17, 30, 0, DateTimeKind.Utc); // 00:30 VN
        var provider = new DateTimeProvider("Asia/Ho_Chi_Minh", () => fixedUtcNow);

        var businessNow = provider.BusinessNow();
        var businessToday = provider.BusinessToday();

        businessNow.Year.Should().Be(2026);
        businessNow.Month.Should().Be(4);
        businessNow.Day.Should().Be(28);
        businessNow.Hour.Should().Be(0);
        businessNow.Minute.Should().Be(30);
        businessToday.Should().Be(new DateOnly(2026, 4, 28));
    }
}
