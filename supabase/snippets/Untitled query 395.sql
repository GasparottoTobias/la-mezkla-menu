-- Agregar campo de disponibilidad para envío en categorías
ALTER TABLE categories 
ADD COLUMN is_available_for_delivery BOOLEAN DEFAULT true;

-- Agregar campo de disponibilidad para envío en productos
ALTER TABLE products 
ADD COLUMN is_available_for_delivery BOOLEAN DEFAULT true;

-- Asegurarnos de que order_items tenga unit_price (ya estaba en tu esquema, pero lo validamos)
-- Este campo es vital para el BI: si una pizza hoy sale $10.000 y mañana $12.000, 
-- tus estadísticas de ventas pasadas deben mantenerse con el valor de $10.000.