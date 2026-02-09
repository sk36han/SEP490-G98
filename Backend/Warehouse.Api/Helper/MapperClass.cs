using AutoMapper;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.Helper
{
    public class MapperClass : Profile
    {
        public MapperClass()
        {
            // User mappings
            CreateMap<User, UserResponse>();
        }
    }
}
