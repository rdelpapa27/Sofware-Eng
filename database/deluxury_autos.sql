CREATE DATABASE DeluxuryAutos;
USE DeluxuryAutos;

-- Table for storing products
CREATE TABLE Products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(255) NOT NULL
);

-- Table for storing product components (Each product must have at least 3 components)
CREATE TABLE ProductComponents (
    component_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE
);
-- Insert Products
INSERT INTO Products (name, price, description, image_url) VALUES
('Tesla Model S', 79999.99, 'A high-performance electric luxury sedan with cutting-edge technology.', 'images/tesla_model_s.jpg'),
('Lamborghini Aventador', 393695.00, 'A powerful supercar with a V12 engine and aggressive design.', 'images/lamborghini_aventador.jpg'),
('Rolls-Royce Phantom', 460000.00, 'The pinnacle of luxury and comfort, handcrafted for elegance.', 'images/rolls_royce_phantom.jpg');

-- Insert Components for Tesla Model S
INSERT INTO ProductComponents (product_id, component_name) VALUES
(1, 'Electric Battery Pack'),
(1, 'Autopilot System'),
(1, 'All-Wheel Drive');

-- Insert Components for Lamborghini Aventador
INSERT INTO ProductComponents (product_id, component_name) VALUES
(2, 'V12 Engine'),
(2, 'Carbon Fiber Chassis'),
(2, 'Aerodynamic Design');

-- Insert Components for Rolls-Royce Phantom
INSERT INTO ProductComponents (product_id, component_name) VALUES
(3, 'Handcrafted Leather Interior'),
(3, 'V12 Engine'),
(3, 'Bespoke Sound System');
