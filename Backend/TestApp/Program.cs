using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using Microsoft.Extensions.DependencyInjection;

namespace TestScript
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var services = new ServiceCollection();
            services.AddDbContext<Mkiwms5Context>(options =>
                options.UseSqlServer("server=(local);database=MKIWMS5;uid=sa;pwd=123456;TrustServerCertificate=true"));
            
            services.AddScoped<IStocktakeService, StocktakeService>();
            services.AddScoped<IStocktakePlanService, StocktakePlanService>();

            var provider = services.BuildServiceProvider();
            var service = provider.GetRequiredService<IStocktakePlanService>();
            
            try
            {
                var req = new StocktakeApprovalRequest { Decision = "RECOUNT", Reason = "string" };
                // Using 13 as stocktakeId based on the screenshot, and currentUserId = 4
                await service.ApproveStocktakePlanAsync(13, req, 4);
                Console.WriteLine("SUCCESS");
            }
            catch (Exception ex)
            {
                Console.WriteLine("EXCEPTION:");
                Console.WriteLine(ex.Message);
                if (ex.InnerException != null)
                {
                    Console.WriteLine("INNER:");
                    Console.WriteLine(ex.InnerException.Message);
                }
            }
        }
    }
}
