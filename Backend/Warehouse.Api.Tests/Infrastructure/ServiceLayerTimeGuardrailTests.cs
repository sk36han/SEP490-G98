using System.Text.RegularExpressions;
using FluentAssertions;

namespace WarehouseTests.Infrastructure;

public class ServiceLayerTimeGuardrailTests
{
    [Fact]
    public void ServiceLayer_ShouldNotUseDateTimeNowOrToday_Directly()
    {
        var serviceRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Warehouse.DataAcces", "Service"));
        var csFiles = Directory.GetFiles(serviceRoot, "*.cs", SearchOption.AllDirectories)
            .Where(path => !path.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase))
            .Where(path => !path.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var violations = new List<string>();
        foreach (var file in csFiles)
        {
            var content = File.ReadAllText(file);
            if (Regex.IsMatch(content, @"\bDateTime\.(Now|Today)\b"))
            {
                violations.Add(Path.GetRelativePath(serviceRoot, file));
            }
        }

        violations.Should().BeEmpty("service layer must use IDateTimeProvider for business time operations");
    }
}
