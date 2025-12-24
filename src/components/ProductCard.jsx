export default function ProductCard({ product }) {
  return (
    <div className="border rounded-lg shadow p-4">
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-40 object-cover rounded"
        />
      )}
      <h2 className="text-lg font-bold mt-2">{product.name}</h2>
      <p className="text-gray-600">₹{product.price}</p>
      <p className="text-sm text-gray-500">{product.description}</p>
    </div>
  );
}
