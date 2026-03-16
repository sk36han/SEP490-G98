using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.Entities.Models;

namespace DebugScripts
{
    public class CheckStocktakeStatus
    {
        public static async Task Run(Mkiwms5Context context)
        {
            var session = await context.StocktakeSessions
                .FirstOrDefaultAsync(s => s.StocktakeId == 1);
            
            if (session != null)
            {
                Console.WriteLine($"[INFO] StocktakeId 1 has Status: {session.Status}");
            }
            else
            {
                Console.WriteLine($"[INFO] StocktakeId 1 not found.");
            }
        }
    }
}
