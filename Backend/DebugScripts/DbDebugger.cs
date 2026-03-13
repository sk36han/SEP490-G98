using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.Entities.Models;

namespace DebugScripts
{
    public class DbDebugger
    {
        public static async Task DebugSaveStocktakeDraft(Mkiwms5Context context, long warehouseId, long userId)
        {
            try
            {
                var year = DateTime.UtcNow.Year;
                var newCode = $"ST-{year}-DEBUG-{Guid.NewGuid().ToString().Substring(0, 4)}";

                var session = new StocktakeSession
                {
                    StocktakeCode = newCode,
                    WarehouseId = warehouseId,
                    Mode = "FULL",
                    Status = "DRAFT",
                    CreatedBy = userId,
                    PlannedAt = DateTime.UtcNow
                };

                context.StocktakeSessions.Add(session);
                await context.SaveChangesAsync();
                Console.WriteLine("Save Successful!");
            }
            catch (DbUpdateException ex)
            {
                Console.WriteLine("DbUpdateException caught!");
                Console.WriteLine("Message: " + ex.Message);
                if (ex.InnerException != null)
                {
                    Console.WriteLine("Inner Exception: " + ex.InnerException.Message);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("General Exception: " + ex.Message);
            }
        }
    }
}
