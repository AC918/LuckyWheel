using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

var dataFile = Path.Combine(app.Environment.ContentRootPath, "wheel.json");

List<WheelItem> LoadItems()
{
    if (!File.Exists(dataFile))
    {
        return new List<WheelItem>
        {
            new("1", "Giải Nhất", "#ff4d4f", 1),
            new("2", "Giải Nhì", "#faad14", 2),
            new("3", "Giải Ba", "#52c41a", 3),
            new("4", "Chúc may mắn", "#1890ff", 4),
        };
    }

    var json = File.ReadAllText(dataFile);
    return JsonSerializer.Deserialize<List<WheelItem>>(json) ?? new();
}

void SaveItems(List<WheelItem> items)
{
    var json = JsonSerializer.Serialize(items, new JsonSerializerOptions { WriteIndented = true });
    File.WriteAllText(dataFile, json);
}

app.MapGet("/api/wheel", () => Results.Ok(LoadItems()));

app.MapPost("/api/wheel", async (HttpRequest req) =>
{
    var items = await req.ReadFromJsonAsync<List<WheelItem>>();
    if (items is null || items.Count < 2) return Results.BadRequest();
    SaveItems(items);
    return Results.Ok();
});

app.Run();

public record WheelItem(string Id, string Text, string Color, double Weight);
