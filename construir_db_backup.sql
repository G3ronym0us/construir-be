--
-- PostgreSQL database dump
--

\restrict rXcvVA8QpwZqnyo2AGaOEMq2DJhwscAEWlhDOYn952x5FiGSOXi0f8gAQLx1Sg2

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: discounts_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.discounts_type_enum AS ENUM (
    'percentage',
    'fixed'
);


ALTER TYPE public.discounts_type_enum OWNER TO postgres;

--
-- Name: orders_delivery_method_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.orders_delivery_method_enum AS ENUM (
    'pickup',
    'delivery'
);


ALTER TYPE public.orders_delivery_method_enum OWNER TO postgres;

--
-- Name: orders_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.orders_status_enum AS ENUM (
    'pending',
    'payment_review',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
);


ALTER TYPE public.orders_status_enum OWNER TO postgres;

--
-- Name: payment_info_method_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_info_method_enum AS ENUM (
    'zelle',
    'pagomovil',
    'transferencia'
);


ALTER TYPE public.payment_info_method_enum OWNER TO postgres;

--
-- Name: payment_info_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_info_status_enum AS ENUM (
    'pending',
    'verified',
    'rejected'
);


ALTER TYPE public.payment_info_status_enum OWNER TO postgres;

--
-- Name: roles_name_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.roles_name_enum AS ENUM (
    'admin',
    'user'
);


ALTER TYPE public.roles_name_enum OWNER TO postgres;

--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_role_enum AS ENUM (
    'admin',
    'user'
);


ALTER TYPE public.users_role_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: banners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.banners (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    link character varying,
    images jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.banners OWNER TO postgres;

--
-- Name: banners_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.banners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.banners_id_seq OWNER TO postgres;

--
-- Name: banners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.banners_id_seq OWNED BY public.banners.id;


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    id integer NOT NULL,
    cart_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- Name: cart_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cart_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cart_items_id_seq OWNER TO postgres;

--
-- Name: cart_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cart_items_id_seq OWNED BY public.cart_items.id;


--
-- Name: carts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carts (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.carts OWNER TO postgres;

--
-- Name: carts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.carts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.carts_id_seq OWNER TO postgres;

--
-- Name: carts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.carts_id_seq OWNED BY public.carts.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    description text,
    image character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    "isFeatured" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: discounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discounts (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    description character varying(255),
    type public.discounts_type_enum DEFAULT 'percentage'::public.discounts_type_enum NOT NULL,
    value numeric(10,2) NOT NULL,
    "minPurchaseAmount" numeric(10,2),
    "maxDiscountAmount" numeric(10,2),
    "startDate" timestamp without time zone,
    "endDate" timestamp without time zone,
    "maxUses" integer,
    "currentUses" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.discounts OWNER TO postgres;

--
-- Name: discounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.discounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discounts_id_seq OWNER TO postgres;

--
-- Name: discounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.discounts_id_seq OWNED BY public.discounts.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    product_name character varying NOT NULL,
    product_sku character varying NOT NULL,
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_number character varying NOT NULL,
    user_id integer,
    guest_email character varying,
    shipping_address_id integer,
    payment_info_id integer NOT NULL,
    status public.orders_status_enum DEFAULT 'pending'::public.orders_status_enum NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    tax numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    shipping numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(10,2) NOT NULL,
    notes text,
    admin_notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    delivery_method public.orders_delivery_method_enum DEFAULT 'delivery'::public.orders_delivery_method_enum NOT NULL,
    discount_id integer,
    discount_code character varying,
    discount_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payment_info; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_info (
    id integer NOT NULL,
    method public.payment_info_method_enum NOT NULL,
    status public.payment_info_status_enum DEFAULT 'pending'::public.payment_info_status_enum NOT NULL,
    sender_name character varying,
    sender_bank character varying,
    phone_number character varying,
    cedula character varying,
    bank character varying,
    reference_code character varying,
    account_name character varying,
    reference_number character varying,
    receipt_url character varying,
    receipt_key character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payment_info OWNER TO postgres;

--
-- Name: payment_info_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_info_id_seq OWNER TO postgres;

--
-- Name: payment_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_info_id_seq OWNED BY public.payment_info.id;


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_categories (
    product_id integer NOT NULL,
    category_id integer NOT NULL
);


ALTER TABLE public.product_categories OWNER TO postgres;

--
-- Name: product_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_images (
    id integer NOT NULL,
    url character varying NOT NULL,
    key character varying NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    product_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_images OWNER TO postgres;

--
-- Name: product_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_images_id_seq OWNER TO postgres;

--
-- Name: product_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_images_id_seq OWNED BY public.product_images.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    sku character varying NOT NULL,
    inventory integer DEFAULT 0 NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    description text,
    "shortDescription" text,
    type character varying(20) DEFAULT 'simple'::character varying NOT NULL,
    published boolean DEFAULT true NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    visibility character varying(50) DEFAULT 'visible'::character varying NOT NULL,
    barcode character varying(100),
    tags text
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name public.roles_name_enum NOT NULL,
    description character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: shipping_addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipping_addresses (
    id integer NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    email character varying NOT NULL,
    phone character varying NOT NULL,
    address text NOT NULL,
    city character varying NOT NULL,
    state character varying NOT NULL,
    zip_code character varying NOT NULL,
    country character varying DEFAULT 'Venezuela'::character varying NOT NULL,
    additional_info text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8)
);


ALTER TABLE public.shipping_addresses OWNER TO postgres;

--
-- Name: shipping_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shipping_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shipping_addresses_id_seq OWNER TO postgres;

--
-- Name: shipping_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shipping_addresses_id_seq OWNED BY public.shipping_addresses.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    email character varying NOT NULL,
    password character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    role public.users_role_enum DEFAULT 'user'::public.users_role_enum NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: banners id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banners ALTER COLUMN id SET DEFAULT nextval('public.banners_id_seq'::regclass);


--
-- Name: cart_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items ALTER COLUMN id SET DEFAULT nextval('public.cart_items_id_seq'::regclass);


--
-- Name: carts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts ALTER COLUMN id SET DEFAULT nextval('public.carts_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: discounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discounts ALTER COLUMN id SET DEFAULT nextval('public.discounts_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: payment_info id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_info ALTER COLUMN id SET DEFAULT nextval('public.payment_info_id_seq'::regclass);


--
-- Name: product_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images ALTER COLUMN id SET DEFAULT nextval('public.product_images_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: shipping_addresses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_addresses ALTER COLUMN id SET DEFAULT nextval('public.shipping_addresses_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.banners (id, uuid, title, description, is_active, priority, start_date, end_date, link, images, created_at, updated_at, deleted_at) FROM stdin;
1	d9018350-ab3f-4132-a9b2-478c9a09fda9	Dolores eiusmod assu	Magna deserunt eius 	t	1	2025-10-03 09:52:00	2025-11-21 07:13:00	https://www.legilixi.org.uk	{"mobile": {"jpeg": "https://congress-marketing.s3.us-east-2.amazonaws.com/banners/4d23b666-a9be-44d1-98e4-999c675779f8-mobile.jpg", "webp": "https://congress-marketing.s3.us-east-2.amazonaws.com/banners/4d23b666-a9be-44d1-98e4-999c675779f8-mobile.webp"}, "tablet": {"jpeg": "https://congress-marketing.s3.us-east-2.amazonaws.com/banners/0825e60b-df69-4d52-8dfe-d2ae71bef465-tablet.jpg", "webp": "https://congress-marketing.s3.us-east-2.amazonaws.com/banners/0825e60b-df69-4d52-8dfe-d2ae71bef465-tablet.webp"}, "desktop": {"jpeg": "https://congress-marketing.s3.us-east-2.amazonaws.com/banners/ca5fde9e-4b0e-4a14-98b1-4a8c526903be-desktop.jpg", "webp": "https://congress-marketing.s3.us-east-2.amazonaws.com/banners/ca5fde9e-4b0e-4a14-98b1-4a8c526903be-desktop.webp"}}	2025-10-07 15:13:10.43874	2025-10-23 17:23:20.948454	\N
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_items (id, cart_id, product_id, quantity, price, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carts (id, uuid, user_id, created_at, updated_at) FROM stdin;
3	0070f86f-0bb0-488e-8764-23467e16aba4	1	2025-11-10 10:47:37.860463	2025-11-10 10:47:37.860463
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, uuid, name, slug, description, image, "isActive", created_at, updated_at, deleted_at, "isFeatured") FROM stdin;
1	2cfb13e4-75c2-49fe-8139-19256028499c	BROCHAS Y RODILLOS	brochas-y-rodillos	\N	\N	t	2025-10-25 01:00:42.438832	2025-10-25 01:00:42.438832	\N	f
2	8c8af70a-b989-4da8-aa0a-6689f31a9353	HERRAMIENTAS SKIL	herramientas-skil	\N	\N	t	2025-10-25 01:00:42.465707	2025-10-25 01:00:42.465707	\N	f
3	e8ef4c23-5509-4fd2-91c7-0a5a32ac73e1	SALAS DE BA¥OS	salas-de-baos	\N	\N	t	2025-10-25 01:00:42.473092	2025-10-25 01:00:42.473092	\N	f
4	9a83341b-769c-44c6-b738-ae1b2d071f23	HERRAMIENTAS ELECTRICAS	herramientas-electricas	\N	\N	t	2025-10-25 01:00:42.491426	2025-10-25 01:00:42.491426	\N	f
5	bf47b9b1-bfd6-4d52-9cd5-bd484f4d6f5a	HIDROLIMPIADORAS	hidrolimpiadoras	\N	\N	t	2025-10-25 01:00:42.506485	2025-10-25 01:00:42.506485	\N	f
6	433232bb-2566-44ab-8625-1a5c02f84ddf	SANITARIOS	sanitarios	\N	\N	t	2025-10-25 01:00:42.512828	2025-10-25 01:00:42.512828	\N	f
7	b3a8ab72-6ecd-4499-be96-85eae73ee107	LLAVES P/LAVAMANOS	llaves-plavamanos	\N	\N	t	2025-10-25 01:00:42.525178	2025-10-25 01:00:42.525178	\N	f
8	0f3400f8-0aae-4901-94d8-1d4853a2c5dd	HIDRONEUMATICOS - ELECTROBOM	hidroneumaticos-electrobom	\N	\N	t	2025-10-25 01:00:42.534733	2025-10-25 01:00:42.534733	\N	f
9	adbe89cb-c0f9-489e-a5ab-1873e2ba0cc4	PESOS - BALANZAS	pesos-balanzas	\N	\N	t	2025-10-25 01:00:42.568842	2025-10-25 01:00:42.568842	\N	f
10	4e5f43a0-720d-4664-acab-acf2e4c72563	MECHAS CONCRETO-METAL-MADERA	mechas-concreto-metal-madera	\N	\N	t	2025-10-25 01:00:42.579908	2025-10-25 01:00:42.579908	\N	f
11	fc3834d7-3fe2-4dce-911a-46a51876541b	COMPRESORES	compresores	\N	\N	t	2025-10-25 01:00:42.58911	2025-10-25 01:00:42.58911	\N	f
12	e0b9478c-6270-46b2-aa8b-bc49e010a522	PEGAS	pegas	\N	\N	t	2025-10-25 01:00:42.600709	2025-10-25 01:00:42.600709	\N	f
13	ece3e04e-6782-4d42-9049-d16b20147e79	FERRETERIA VARIADA	ferreteria-variada	\N	\N	t	2025-10-25 01:00:42.607372	2025-10-25 01:00:42.607372	\N	f
14	97b5ef61-7333-4d22-a35f-3805b057c1df	PALAS-PICOS	palas-picos	\N	\N	t	2025-10-25 01:00:42.614499	2025-10-25 01:00:42.614499	\N	f
15	14da5dd2-6e37-4083-b064-9380a127f697	REPUESTOS P/HERRAMIENTAS	repuestos-pherramientas	\N	\N	t	2025-10-25 01:00:42.624984	2025-10-25 01:00:42.624984	\N	f
16	82319198-9e00-428b-99a7-aa1c87a77c9d	DISCO P/SIERRAS -P/C.MARMOL ET	disco-psierras-pcmarmol-et	\N	\N	t	2025-10-25 01:00:42.632443	2025-10-25 01:00:42.632443	\N	f
17	bf410712-32df-4fb1-a848-821ef53df979	CERAMICA-TERRAGRES	ceramica-terragres	\N	\N	t	2025-10-25 01:00:42.63854	2025-10-25 01:00:42.63854	\N	f
18	a82aa4e2-ac47-44f9-a169-4096a27272e3	CAICO	caico	\N	\N	t	2025-10-25 01:00:42.645937	2025-10-25 01:00:42.645937	\N	f
19	0169b275-7c5c-4e02-9fea-d64e7c33800e	HERRAMIENTAS	herramientas	\N	\N	t	2025-10-25 01:00:42.655113	2025-10-25 01:00:42.655113	\N	f
20	2e4ce099-cfc2-4013-8ffd-4a83f2129b83	CARRETILLAS - CARRUCHAS	carretillas-carruchas	\N	\N	t	2025-10-25 01:00:42.663448	2025-10-25 01:00:42.663448	\N	f
21	ba7b6036-dc72-4ae1-bded-c4fe5ca4cbf7	GENERADOR/MOTORES/MOTOBOMBA	generadormotoresmotobomba	\N	\N	t	2025-10-25 01:00:42.672528	2025-10-25 01:00:42.672528	\N	f
22	e4c03fbc-ba20-4e3d-bc4f-39f26d92c8ca	FILTROS Y BUJIAS	filtros-y-bujias	\N	\N	t	2025-10-25 01:00:42.680827	2025-10-25 01:00:42.680827	\N	f
23	60528f32-ee23-4150-8e46-71f93fee061b	CORTAGRAMAS-DESMALEZ-DESBROZAD	cortagramas-desmalez-desbrozad	\N	\N	t	2025-10-25 01:00:42.686796	2025-10-25 01:00:42.686796	\N	f
24	bb8685b9-052d-4578-84c6-5c965b14bcbc	PINTURA	pintura	\N	\N	t	2025-10-25 01:00:42.693251	2025-10-25 01:00:42.693251	\N	f
25	2677b34d-ee8f-4a3c-b7da-9b441ba4f0c4	MANTOS	mantos	\N	\N	t	2025-10-25 01:00:42.701852	2025-10-25 01:00:42.701852	\N	f
26	b824c29e-ac2e-42ea-9ab9-74f185a183d3	LAMPARAS FLUORESC-PLAFON-EXTER	lamparas-fluoresc-plafon-exter	\N	\N	t	2025-10-25 01:00:42.713748	2025-10-25 01:00:42.713748	\N	f
27	5ec0d85a-4a49-44f5-9213-69fdd85e5b1e	DESTORNILLADORES	destornilladores	\N	\N	t	2025-10-25 01:00:42.722818	2025-10-25 01:00:42.722818	\N	f
28	162b3fdb-441d-4d4d-894c-a1024223ac31	GRAPAS	grapas	\N	\N	t	2025-10-25 01:00:42.734213	2025-10-25 01:00:42.734213	\N	f
29	15ffd77f-53ac-4e12-acf2-8fe663b702da	TENAZAS Y ALICATES	tenazas-y-alicates	\N	\N	t	2025-10-25 01:00:42.742504	2025-10-25 01:00:42.742504	\N	f
30	b57ab8c4-82a2-4b55-ad5f-06f810d0d336	CIZALLAS - TIJERAS	cizallas-tijeras	\N	\N	t	2025-10-25 01:00:42.754028	2025-10-25 01:00:42.754028	\N	f
31	9ad7cfaa-2fda-42f7-a183-18466d2938b7	MARTILLOS	martillos	\N	\N	t	2025-10-25 01:00:42.760165	2025-10-25 01:00:42.760165	\N	f
32	50295679-dbdc-4a43-b019-6833655f0f25	CUCHILLAS	cuchillas	\N	\N	t	2025-10-25 01:00:42.765972	2025-10-25 01:00:42.765972	\N	f
33	e1215aaa-7722-4ce9-abf9-52f120f8977d	CINTAS METRICAS	cintas-metricas	\N	\N	t	2025-10-25 01:00:42.775503	2025-10-25 01:00:42.775503	\N	f
34	c72438e3-5921-4334-b257-7f630e4bbc47	SILICON	silicon	\N	\N	t	2025-10-25 01:00:42.783608	2025-10-25 01:00:42.783608	\N	f
36	3c957df4-9612-46d5-9a2c-8d9e9a7e75fd	ELECTRICIDAD	electricidad	\N	\N	t	2025-10-25 01:00:42.803385	2025-10-25 01:00:42.803385	\N	f
38	a6ea1fd3-0270-49e5-a3c8-fa27f805e985	CEMENTO BLANCO	cemento-blanco	\N	\N	t	2025-10-25 01:00:42.822978	2025-10-25 01:00:42.822978	\N	f
39	1ede1baa-b5c9-4001-8c12-680798ac600f	TUBOS CONSTRUCCION	tubos-construccion	\N	\N	t	2025-10-25 01:00:42.832115	2025-10-25 01:00:42.832115	\N	f
40	a826e83c-8e4c-4edb-b6a6-b1c75aa391fd	TANQUES DE AGUA - TAMBORES	tanques-de-agua-tambores	\N	\N	t	2025-10-25 01:00:42.839624	2025-10-25 01:00:42.839624	\N	f
41	f59013d8-1391-4364-a273-8caebfd80633	CERRADURAS - ACCESORIOS	cerraduras-accesorios	\N	\N	t	2025-10-25 01:00:42.851112	2025-10-25 01:00:42.851112	\N	f
42	2cc557ce-996f-4173-b638-897c2b458399	RAMPLUG	ramplug	\N	\N	t	2025-10-25 01:00:42.858871	2025-10-25 01:00:42.858871	\N	f
43	6282d363-487c-4a74-b74e-71f1a19fa5cb	GRIFERIAS	griferias	\N	\N	t	2025-10-25 01:00:42.866105	2025-10-25 01:00:42.866105	\N	f
44	36ccfc93-a9d0-4e77-807a-9b5cce7e240d	SEGURIDAD INDUSTRIAL	seguridad-industrial	\N	\N	t	2025-10-25 01:00:42.879869	2025-10-25 01:00:42.879869	\N	f
45	b991806e-3018-41fc-b3a7-1cfaadfdb33f	PLOMERIA	plomeria	\N	\N	t	2025-10-25 01:00:42.88751	2025-10-25 01:00:42.88751	\N	f
46	b8e82766-24f8-478b-943e-025281bc022d	MEZCLADORAS	mezcladoras	\N	\N	t	2025-10-25 01:00:42.892705	2025-10-25 01:00:42.892705	\N	f
47	1b58df59-7eaf-4ee5-a585-6c745e9d4717	REPUESTOS PARA BA¥O	repuestos-para-bao	\N	\N	t	2025-10-25 01:00:42.896997	2025-10-25 01:00:42.896997	\N	f
48	ce30f570-42d5-4f18-8baa-cfbcf4d862f0	Sin categorizar	sin-categorizar	\N	\N	t	2025-10-25 01:00:42.90219	2025-10-25 01:00:42.90219	\N	f
49	bdafc83d-e974-4a66-8942-3dc7ed9b2ea7	PROTECTORES ELECTRONICOS	protectores-electronicos	\N	\N	t	2025-10-25 01:00:42.906571	2025-10-25 01:00:42.906571	\N	f
50	9feb18ae-334a-464d-a12c-fea767a65e82	MOTOSIERRAS	motosierras	\N	\N	t	2025-10-25 01:00:42.911585	2025-10-25 01:00:42.911585	\N	f
51	c65c49d5-e447-499d-937c-42a74372cf2d	FUMIGADORAS	fumigadoras	\N	\N	t	2025-10-25 01:00:42.916119	2025-10-25 01:00:42.916119	\N	f
52	709c25c1-3a8a-4adf-9fe1-358bed3816c4	GUANTES	guantes	\N	\N	t	2025-10-25 01:00:42.920768	2025-10-25 01:00:42.920768	\N	f
53	280404a6-a9d5-4db0-b87a-3d5391481ca9	OXICORTE	oxicorte	\N	\N	t	2025-10-25 01:00:42.924771	2025-10-25 01:00:42.924771	\N	f
55	22f07624-131a-48a9-9ba9-939345ddd615	TUBOS ESTRUCTURALES	tubos-estructurales	\N	\N	t	2025-10-25 01:00:42.93409	2025-10-25 01:00:42.93409	\N	f
56	e4f59036-1fed-47d0-9db3-f8fd769dc9ca	TUBOS RECTANGULARES HP	tubos-rectangulares-hp	\N	\N	t	2025-10-25 01:00:42.938814	2025-10-25 01:00:42.938814	\N	f
57	035c860e-8fa2-4f0d-875e-4002b4bee85e	TIVEN BREAKER TICINO	tiven-breaker-ticino	\N	\N	t	2025-10-25 01:00:42.943406	2025-10-25 01:00:42.943406	\N	f
58	5f153f0b-9653-42fb-8e20-344adec1688b	BREAKERS	breakers	\N	\N	t	2025-10-25 01:00:42.955621	2025-10-25 01:00:42.955621	\N	f
59	289a303b-1089-4bc6-ae99-d1a92abf50a5	TIBRA BREAKER TICINO	tibra-breaker-ticino	\N	\N	t	2025-10-25 01:00:42.961397	2025-10-25 01:00:42.961397	\N	f
60	a4ef5adb-1d43-481f-b4ce-08badfc16e96	GRUPOS P/DUCHAS	grupos-pduchas	\N	\N	t	2025-10-25 01:00:42.968735	2025-10-25 01:00:42.968735	\N	f
61	f090aea3-bc49-49c1-8aad-96a229f487d6	EXTENSIONES ELECTRICAS	extensiones-electricas	\N	\N	t	2025-10-25 01:00:42.977357	2025-10-25 01:00:42.977357	\N	f
62	71efec5f-f485-44f3-b9cf-0046e1eeea25	MAT DA¥ADO DE SEGUNDA	mat-daado-de-segunda	\N	\N	t	2025-10-25 01:00:42.988204	2025-10-25 01:00:42.988204	\N	f
63	53bb3725-286e-429c-af97-e513fd0c7163	HACHAS-MACHETES-CUCHILLOS	hachas-machetes-cuchillos	\N	\N	t	2025-10-25 01:00:42.996421	2025-10-25 01:00:42.996421	\N	f
64	e0b35190-a1da-4fc6-a983-4900781b92b0	LIJAS-LIMAS	lijas-limas	\N	\N	t	2025-10-25 01:00:43.00514	2025-10-25 01:00:43.00514	\N	f
65	46677178-5af1-4cf4-bc5b-5d5b10b4dbdc	CANDADOS	candados	\N	\N	t	2025-10-25 01:00:43.011914	2025-10-25 01:00:43.011914	\N	f
66	1d063070-06e8-41f7-9477-8e1875eeb5ba	PINT VENCIDA	pint-vencida	\N	\N	t	2025-10-25 01:00:43.023395	2025-10-25 01:00:43.023395	\N	f
69	8cf5bfa4-fb26-4252-b10d-739dafcf3f6b	CONEXIONES PVC AN	conexiones-pvc-an	\N	\N	t	2025-10-25 01:00:43.039612	2025-10-25 01:00:43.039612	\N	f
67	bc5701fd-85e3-4187-be65-dc2701ec1e91	BARNIZ	barniz	\N	\N	t	2025-10-25 01:00:43.030931	2025-11-10 10:34:08.430863	\N	t
37	2ebf024c-0370-429a-b039-7910ce2133c3	ADITIVOS-SOLVENTES-THINNER	aditivos-solventes-thinner		https://congress-marketing.s3.us-east-2.amazonaws.com/categories/a504e701-0945-460a-aa03-165208464323-category.webp	t	2025-10-25 01:00:42.81163	2025-11-06 12:14:31.39392	\N	t
70	6c7048ae-89f6-4f0c-806a-be5b46f48c7c	GANCHOS PARA TECHO	ganchos-para-techo	\N	\N	t	2025-10-25 01:00:43.044437	2025-10-25 01:00:43.044437	\N	f
71	96b6ad52-a019-420a-8997-93bd50c6717b	CONEXIONES PVC AB	conexiones-pvc-ab	\N	\N	t	2025-10-25 01:00:43.049296	2025-10-25 01:00:43.049296	\N	f
72	9fede2af-dff4-4d15-8119-6830b188ab2d	CONEXIONES GALVANIZADAS (HG)	conexiones-galvanizadas-hg	\N	\N	t	2025-10-25 01:00:43.056218	2025-10-25 01:00:43.056218	\N	f
73	d45312a0-3a98-4b8a-9af7-5245a74a32e7	CONEXIONES PCO ELECT	conexiones-pco-elect	\N	\N	t	2025-10-25 01:00:43.065196	2025-10-25 01:00:43.065196	\N	f
74	2c66f994-0c54-4451-a7cd-2bc1a3312940	CONEXIONES PCO AN	conexiones-pco-an	\N	\N	t	2025-10-25 01:00:43.070939	2025-10-25 01:00:43.070939	\N	f
75	48372482-9a99-4230-99af-502982897ce0	CONEXIONES PCO A.B	conexiones-pco-ab	\N	\N	t	2025-10-25 01:00:43.07572	2025-10-25 01:00:43.07572	\N	f
76	f817b76a-96df-4fdf-8eeb-ac1a0ee8c475	CONEXIONES PCO C.A-B	conexiones-pco-ca-b	\N	\N	t	2025-10-25 01:00:43.08046	2025-10-25 01:00:43.08046	\N	f
77	6ff3e3d0-4e89-42de-bfac-9419f7102fb7	CANAL-ACCESORIOS PARA CANAL	canal-accesorios-para-canal	\N	\N	t	2025-10-25 01:00:43.085273	2025-10-25 01:00:43.085273	\N	f
78	712e6183-5f70-4da0-ab40-c54c8c476f28	CONEXIONES PCO ACUED	conexiones-pco-acued	\N	\N	t	2025-10-25 01:00:43.089194	2025-10-25 01:00:43.089194	\N	f
79	37ed9330-ea3e-4d73-99f8-da3fd98e7043	CAJETINES	cajetines	\N	\N	t	2025-10-25 01:00:43.095466	2025-10-25 01:00:43.095466	\N	f
80	568b1847-3943-457c-aad1-1b1a1680d1cd	HERRAJES P/BA¥O-TANQUES-REP	herrajes-pbao-tanques-rep	\N	\N	t	2025-10-25 01:00:43.105742	2025-10-25 01:00:43.105742	\N	f
81	9b35cda2-b4a3-4b3d-ae55-5d3d53f15af1	CONEX TUBRICA A/B	conex-tubrica-ab	\N	\N	t	2025-10-25 01:00:43.110879	2025-10-25 01:00:43.110879	\N	f
82	f0c041bb-706e-425e-8d42-fb8493b82325	CONEX TUBRICA C-PVC	conex-tubrica-c-pvc	\N	\N	t	2025-10-25 01:00:43.116137	2025-10-25 01:00:43.116137	\N	f
83	e35871fe-4846-48d6-b8e9-0646d0170c86	CONEX TUBRICA A/N	conex-tubrica-an	\N	\N	t	2025-10-25 01:00:43.120545	2025-10-25 01:00:43.120545	\N	f
84	aa398ae5-c71c-40d1-95d9-b8a881c1782d	CONEX TUBRICA ELECT	conex-tubrica-elect	\N	\N	t	2025-10-25 01:00:43.124854	2025-10-25 01:00:43.124854	\N	f
85	14326b2d-b6be-4a30-b1f4-8975d59bfd0d	CINTAS-TIRROS -TEFLON-ADHES	cintas-tirros-teflon-adhes	\N	\N	t	2025-10-25 01:00:43.129036	2025-10-25 01:00:43.129036	\N	f
86	a5627131-8db6-4486-9783-25251308f0c8	REJILLAS - INODOROS - TAPA REG	rejillas-inodoros-tapa-reg	\N	\N	t	2025-10-25 01:00:43.134476	2025-10-25 01:00:43.134476	\N	f
87	2485ac09-89e7-497c-af61-44c8c5f021c8	LLAVE P/DUCHAS	llave-pduchas	\N	\N	t	2025-10-25 01:00:43.1426	2025-10-25 01:00:43.1426	\N	f
88	51b5f14c-7f3a-4353-adcc-8f14b62a0610	DUCHAS-REGADERAS -ROSETAS	duchas-regaderas-rosetas	\N	\N	t	2025-10-25 01:00:43.149094	2025-10-25 01:00:43.149094	\N	f
89	01965d4d-f01f-4e70-8ea4-66adc43b7067	BOMBILLOS-FLOURECENTES-HALOG	bombillos-flourecentes-halog	\N	\N	t	2025-10-25 01:00:43.153772	2025-10-25 01:00:43.153772	\N	f
90	b7638029-d189-429d-836b-4857ef25f85d	LAMPARAS ESPECULARES	lamparas-especulares	\N	\N	t	2025-10-25 01:00:43.157987	2025-10-25 01:00:43.157987	\N	f
91	5c556d72-a6de-47b6-a132-921521ef1091	CILINDROS	cilindros	\N	\N	t	2025-10-25 01:00:43.162987	2025-10-25 01:00:43.162987	\N	f
92	8ceace3d-317f-42ff-af64-4f6b65d8a892	HERRAMIENTAS TAKIMA	herramientas-takima	\N	\N	t	2025-10-25 01:00:43.167476	2025-10-25 01:00:43.167476	\N	f
93	e9e3c652-8c76-4996-b38a-5d23a503f158	RASTRILLOS-ESCOBA-ESCARDILLAS	rastrillos-escoba-escardillas	\N	\N	t	2025-10-25 01:00:43.174726	2025-10-25 01:00:43.174726	\N	f
94	d8726b24-90c2-4905-8852-ede5c89d55d5	CHICURAS-AZADON-BARRA HOYAR	chicuras-azadon-barra-hoyar	\N	\N	t	2025-10-25 01:00:43.18239	2025-10-25 01:00:43.18239	\N	f
95	f19c98f3-edc5-4d24-a66b-f25347e23b58	ARCO SEGUETA - TALAR	arco-segueta-talar	\N	\N	t	2025-10-25 01:00:43.186935	2025-10-25 01:00:43.186935	\N	f
96	0c2e29b8-6a9b-40ab-b59b-41abb8280afa	PALUSTRAS Y CEPILLO ALBA¥ILER	palustras-y-cepillo-albailer	\N	\N	t	2025-10-25 01:00:43.191725	2025-10-25 01:00:43.191725	\N	f
97	9fcafeb8-918b-43b0-8c96-1b6a283c19c8	CINCELES-PIQUETAS ALBA¥IL	cinceles-piquetas-albail	\N	\N	t	2025-10-25 01:00:43.196627	2025-10-25 01:00:43.196627	\N	f
98	e59dcddb-7251-46a9-be14-6c028b51ae13	PIQUETAS	piquetas	\N	\N	t	2025-10-25 01:00:43.201472	2025-10-25 01:00:43.201472	\N	f
99	53fff458-e817-49bd-a28e-b979e2f2d14d	GRUPOS P/LAVAMANOS	grupos-plavamanos	\N	\N	t	2025-10-25 01:00:43.206521	2025-10-25 01:00:43.206521	\N	f
100	531aeb5f-0ea8-496e-bb92-152519d90db7	GRUPOS P/FREGADERO	grupos-pfregadero	\N	\N	t	2025-10-25 01:00:43.213799	2025-10-25 01:00:43.213799	\N	f
101	80f8d4b7-5fe1-490c-8b00-f42951435ea0	ARTICULOS DEL HOGAR	articulos-del-hogar	\N	\N	t	2025-10-25 01:00:43.220679	2025-10-25 01:00:43.220679	\N	f
35	0405f708-503c-4c21-ba95-b8a7606e162d	ABRASIVOS	abrasivos		https://congress-marketing.s3.us-east-2.amazonaws.com/categories/86380b6e-b0a2-451c-9433-fff7f70ec613-category.webp	t	2025-10-25 01:00:42.793098	2025-11-06 12:01:38.785983	\N	t
54	66dfd390-8ef6-4b46-bccb-63faad48a08f	ANGULOS SIDERURGICOS	angulos-siderurgicos		https://congress-marketing.s3.us-east-2.amazonaws.com/categories/b3ce9a9d-392e-4809-b512-8af8a34cfd19-category.webp	t	2025-10-25 01:00:42.929625	2025-11-06 12:14:36.410024	\N	t
68	6983e9c9-c036-4bf1-b2e1-f01f1be9749c	ACCESORIOS BOSCH	accesorios-bosch		https://congress-marketing.s3.us-east-2.amazonaws.com/categories/105e3056-2e63-426f-8dda-54d660bf5b57-category.webp	t	2025-10-25 01:00:43.035185	2025-11-10 10:36:16.757403	\N	t
\.


--
-- Data for Name: discounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discounts (id, uuid, code, description, type, value, "minPurchaseAmount", "maxDiscountAmount", "startDate", "endDate", "maxUses", "currentUses", "isActive", created_at, updated_at, deleted_at) FROM stdin;
1	d45d21e8-ef63-40d3-8cf0-0492ccb57a9e	VOLUPTATIBUSOFFICIA	Velit culpa repudian	percentage	10.00	10.00	15.00	2025-07-16 14:52:00	2026-06-09 13:09:00	10	0	t	2025-11-06 14:55:52.169079	2025-11-06 14:55:52.169079	\N
2	24358b3f-e2fa-4eaa-9af3-32434445dbe6	DIODI	Dolor quod vel elit	percentage	5.00	10.00	15.00	2025-12-01 19:45:00	2025-12-15 19:50:00	20	0	t	2025-11-10 10:43:09.235927	2025-11-10 10:43:09.235927	\N
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, product_name, product_sku, quantity, price, subtotal, created_at) FROM stdin;
1	1	1268	PINT ESMALTE BRILL CAFE 1/4G ARADOS VERONA	30656	1	9.00	9.00	2025-11-03 10:12:44.757855
2	2	1268	PINT ESMALTE BRILL CAFE 1/4G ARADOS VERONA	30656	1	9.00	9.00	2025-11-03 10:17:36.019392
3	3	1268	PINT ESMALTE BRILL CAFE 1/4G ARADOS VERONA	30656	1	9.00	9.00	2025-11-03 10:37:51.518947
4	4	1183	GRUP FREG SIDNEY G09 FAGUAX	24701	1	39.00	39.00	2025-11-03 15:36:36.57421
5	5	1189	GRUP FREG MONOM MODENA PRI027 MET.ALEADOS	26277	1	191.00	191.00	2025-11-04 12:06:32.89863
6	6	1193	GRUP FREG MONOM MEZCLAD PRI-056 METAL A.	31257	1	141.00	141.00	2025-11-04 12:43:38.536678
7	7	1268	PINT ESMALTE BRILL CAFE 1/4G ARADOS VERONA	30656	1	9.00	9.00	2025-11-06 14:59:53.390468
8	7	1267	PINT ESMALTE BRILL ROJO 1/4G ARADOS VERONA EBARA015	30670	1	9.00	9.00	2025-11-06 14:59:53.390468
9	8	1183	GRUP FREG SIDNEY G09 FAGUAX	24701	1	39.00	39.00	2025-11-10 10:47:27.965581
10	8	1189	GRUP FREG MONOM MODENA PRI027 MET.ALEADOS	26277	1	191.00	191.00	2025-11-10 10:47:27.965581
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, uuid, order_number, user_id, guest_email, shipping_address_id, payment_info_id, status, subtotal, tax, shipping, total, notes, admin_notes, created_at, updated_at, delivery_method, discount_id, discount_code, discount_amount) FROM stdin;
1	914d5264-5a68-4313-aec8-f55aa6423cfd	ORD-MHJ7Z5MO-MI5K	\N	duxi@mailinator.com	1	1	pending	9.00	0.00	0.00	9.00	\N	\N	2025-11-03 10:12:44.739033	2025-11-03 10:12:44.739033	delivery	\N	\N	0.00
2	66c55562-f69f-4f90-a4dc-02e079336932	ORD-MHJ85ECZ-F7AG	\N	djesus1703@gmail.com	2	2	pending	9.00	0.00	0.00	9.00	\N	\N	2025-11-03 10:17:35.992959	2025-11-03 10:17:35.992959	delivery	\N	\N	0.00
3	11cff0c0-60f4-40dd-97e4-00d881ea5d16	ORD-MHJ8VG95-LECS	\N	djesus1703@gmail.com	3	3	payment_review	9.00	0.00	0.00	9.00	\N	\N	2025-11-03 10:37:51.498944	2025-11-03 10:38:31.119951	delivery	\N	\N	0.00
4	6611c901-cd3b-427b-b9ba-049ad08e1116	ORD-MHJJJNBG-L35A	1	\N	4	4	payment_review	39.00	0.00	0.00	39.00	\N	\N	2025-11-03 15:36:36.557414	2025-11-03 15:37:08.80375	delivery	\N	\N	0.00
5	c3a1c67e-d8af-4652-90e7-9274c127e773	ORD-MHKRHCX6-OE2E	\N	gahufa@mailinator.com	5	5	payment_review	191.00	0.00	0.00	191.00	\N	\N	2025-11-04 12:06:32.876449	2025-11-04 12:07:06.117323	delivery	\N	\N	0.00
6	9b29e109-8cb6-4a72-bdd6-1e3606711356	ORD-MHKST27S-D7WF	\N	djesus1703@gmail.com	6	6	payment_review	141.00	0.00	0.00	141.00	\N	\N	2025-11-04 12:43:38.492317	2025-11-04 12:43:45.705139	delivery	\N	\N	0.00
7	93dbcff3-1a2f-4a60-8b37-8291c93873b2	ORD-MHNSJZBT-84EY	\N	riwis@mailinator.com	7	7	payment_review	18.00	0.00	0.00	18.00	\N	\N	2025-11-06 14:59:53.373009	2025-11-06 15:00:00.605043	delivery	\N	\N	0.00
8	8a1dfe81-b032-46c5-afc1-c7472ebf0b32	ORD-MHT9ARP2-777D	1	\N	8	8	payment_review	230.00	0.00	0.00	230.00	\N	\N	2025-11-10 10:47:27.928019	2025-11-10 10:47:31.601883	delivery	\N	\N	0.00
\.


--
-- Data for Name: payment_info; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_info (id, method, status, sender_name, sender_bank, phone_number, cedula, bank, reference_code, account_name, reference_number, receipt_url, receipt_key, notes, created_at, updated_at) FROM stdin;
1	zelle	pending	Hic eligendi consequ	Proident reiciendis	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-11-03 10:12:44.72734	2025-11-03 10:12:44.72734
2	zelle	pending	Hic eligendi consequ	Proident reiciendis	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-11-03 10:17:35.972149	2025-11-03 10:17:35.972149
3	zelle	pending	Hic eligendi consequ	Proident reiciendis	\N	\N	\N	\N	\N	\N	https://congress-marketing.s3.us-east-2.amazonaws.com/receipts/b9e30d71-aaba-4796-b086-4d2f6d4a43d4.png	receipts/b9e30d71-aaba-4796-b086-4d2f6d4a43d4.png	\N	2025-11-03 10:37:51.484287	2025-11-03 10:38:31.068252
4	pagomovil	pending	\N	\N	04141234567	25417852	banco de venezuela	2541	\N	\N	https://congress-marketing.s3.us-east-2.amazonaws.com/receipts/090a7780-920e-4dd2-abbf-942d8b3e9a13.png	receipts/090a7780-920e-4dd2-abbf-942d8b3e9a13.png	\N	2025-11-03 15:36:36.545866	2025-11-03 15:37:08.615587
5	pagomovil	pending	\N	\N	+1 (793) 269-8412	Dolor eos et dolore	Qui aperiam dolor an	Libero ut quia corpo	\N	\N	https://congress-marketing.s3.us-east-2.amazonaws.com/receipts/e8f60d31-517e-4fe5-bbc3-9c418e5bcf40.png	receipts/e8f60d31-517e-4fe5-bbc3-9c418e5bcf40.png	\N	2025-11-04 12:06:32.866559	2025-11-04 12:07:06.049131
6	zelle	pending	Magnam est quo veni	Doloribus enim praes	\N	\N	\N	\N	\N	\N	https://congress-marketing.s3.us-east-2.amazonaws.com/receipts/54ad25b2-e77b-4104-8a6f-4d30d4c59300.png	receipts/54ad25b2-e77b-4104-8a6f-4d30d4c59300.png	\N	2025-11-04 12:43:38.481013	2025-11-04 12:43:45.648476
7	zelle	pending	Magnam cupiditate ir	VOLUPTATIBUSOFFICIAId quisquam nemo ita	\N	\N	\N	\N	\N	\N	https://congress-marketing.s3.us-east-2.amazonaws.com/receipts/060975e5-b6fb-4f96-8588-6b137e3d54ea.png	receipts/060975e5-b6fb-4f96-8588-6b137e3d54ea.png	\N	2025-11-06 14:59:53.355652	2025-11-06 15:00:00.563701
8	transferencia	pending	\N	\N	\N	\N	BANCO DE VENZUELA	\N	DIODIMAR	6485	https://congress-marketing.s3.us-east-2.amazonaws.com/receipts/6f5d3017-4bfb-48df-89df-df97e02c3d29.png	receipts/6f5d3017-4bfb-48df-89df-df97e02c3d29.png	\N	2025-11-10 10:47:27.907655	2025-11-10 10:47:31.518292
\.


--
-- Data for Name: product_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_categories (product_id, category_id) FROM stdin;
1	1
2	2
3	3
4	4
5	4
6	5
7	4
8	4
9	4
10	6
11	4
12	4
13	4
14	4
15	7
16	4
17	4
18	4
19	4
20	8
21	9
22	9
23	9
24	9
25	10
26	10
27	11
28	10
29	12
30	12
31	12
32	13
33	5
34	14
35	15
36	16
37	17
38	17
39	17
40	17
41	18
42	3
43	19
44	20
45	20
46	8
47	21
48	21
49	4
50	8
51	5
52	22
53	22
54	23
55	21
56	4
57	24
58	24
59	24
60	24
61	25
62	24
63	13
64	13
65	13
66	26
67	26
68	26
69	26
70	8
71	27
72	4
73	19
74	19
75	19
76	19
77	4
78	10
79	28
80	29
81	29
82	30
83	31
84	19
85	27
86	19
87	19
88	32
89	19
90	27
91	4
92	33
93	34
94	31
95	19
96	19
97	4
98	35
99	16
100	27
101	33
102	19
103	19
104	35
105	27
106	27
107	19
108	4
109	36
110	19
111	29
112	27
113	27
114	24
115	24
116	24
117	24
118	24
119	24
120	24
121	37
122	37
123	37
124	24
125	24
126	24
127	24
128	24
129	24
130	24
131	38
132	38
133	39
134	40
135	40
136	40
137	40
138	40
139	40
140	39
141	8
142	8
143	41
144	42
145	12
146	8
147	8
148	11
149	4
150	43
151	8
152	8
153	8
154	44
155	45
156	44
157	46
158	8
159	39
160	39
161	40
162	40
163	40
164	40
165	40
166	47
167	48
168	49
169	44
170	8
171	8
172	8
173	50
174	51
175	8
176	23
177	8
178	8
179	21
180	45
181	19
182	45
183	45
184	13
185	8
186	52
187	27
188	53
189	35
190	19
191	19
192	54
193	55
194	54
195	54
196	54
197	54
198	54
199	54
200	54
201	54
202	54
203	54
204	54
205	54
206	54
207	55
208	55
209	56
210	56
211	56
212	56
213	56
214	56
215	56
216	56
217	56
218	56
219	48
220	56
221	55
222	55
223	55
224	55
225	56
226	56
227	56
228	56
229	56
230	56
231	55
232	55
233	55
234	55
235	56
236	56
237	55
238	54
239	54
240	56
241	55
242	55
243	55
244	56
245	56
246	49
247	57
248	58
249	49
250	59
251	57
252	57
253	57
254	58
255	49
256	49
257	57
258	57
259	59
260	59
261	58
262	58
263	49
264	43
265	60
266	57
267	58
268	61
269	58
270	58
271	58
272	58
273	58
274	58
275	45
276	49
277	49
278	58
279	58
280	49
281	62
282	19
283	8
284	8
285	27
286	4
287	33
288	63
289	64
290	65
291	65
292	24
293	24
294	24
295	24
296	24
297	24
298	24
299	24
300	24
301	24
302	66
303	66
304	24
305	24
306	24
307	24
308	24
309	24
310	24
311	24
312	24
313	24
314	24
315	24
316	24
317	24
318	24
319	66
320	24
321	24
322	24
323	24
324	66
325	24
326	24
327	24
328	24
329	24
330	24
331	24
332	24
333	24
334	24
335	24
336	24
337	24
338	24
339	24
340	24
341	24
342	24
343	24
344	66
345	24
346	24
347	24
348	24
349	24
350	24
351	24
352	24
353	66
354	24
355	24
356	66
357	24
358	24
359	24
360	24
361	24
362	24
363	24
364	24
365	24
366	66
367	24
368	24
369	24
370	24
371	24
372	24
373	24
374	24
375	24
376	24
377	24
378	24
379	24
380	24
381	24
382	24
383	66
384	67
385	24
386	24
387	24
388	24
389	24
390	24
391	24
392	24
393	24
394	24
395	24
396	24
397	24
398	24
399	24
400	24
401	24
402	24
403	24
404	24
405	24
406	24
407	24
408	24
409	35
410	35
411	35
412	16
413	35
414	35
415	35
416	35
417	35
418	35
419	35
420	35
421	35
422	35
423	35
424	35
425	16
426	35
427	35
428	35
429	35
430	35
431	35
432	35
433	35
434	16
435	35
436	35
437	35
438	35
439	35
440	35
441	16
442	35
443	16
444	35
445	35
446	35
447	35
448	35
449	35
450	35
451	35
452	35
453	35
454	35
455	35
456	35
457	35
458	35
459	35
460	68
461	35
462	35
463	16
464	35
465	16
466	35
467	35
468	35
469	35
470	35
471	16
472	35
473	16
474	35
475	35
476	35
477	69
478	70
479	71
480	71
481	72
482	73
483	73
484	73
485	73
486	74
487	74
488	74
489	74
490	74
491	74
492	74
493	74
494	74
495	74
496	74
497	74
498	74
499	74
500	74
501	74
502	74
503	74
504	74
505	74
506	74
507	74
508	74
509	74
510	74
511	74
512	74
513	74
514	74
515	74
516	75
517	76
518	76
519	76
520	76
521	76
522	74
523	74
524	74
525	75
526	75
527	75
528	75
529	75
530	75
531	75
532	75
533	75
534	75
535	75
536	75
537	75
538	75
539	75
540	75
541	75
542	75
543	75
544	75
545	75
546	75
547	75
548	75
549	75
550	75
551	75
552	75
553	75
554	75
555	75
556	75
557	75
558	75
559	75
560	75
561	75
562	75
563	75
564	75
565	75
566	75
567	75
568	75
569	75
570	75
571	75
572	75
573	75
574	75
575	75
576	75
577	75
578	75
579	75
580	75
581	75
582	75
583	75
584	75
585	75
586	75
587	75
588	75
589	75
590	75
591	75
592	75
593	75
594	75
595	75
596	75
597	76
598	76
599	76
600	76
601	76
602	76
603	76
604	76
605	76
606	76
607	76
608	76
609	76
610	76
611	76
612	76
613	76
614	76
615	73
616	73
617	73
618	73
619	73
620	73
621	73
622	73
623	73
624	73
625	73
626	73
627	73
628	71
629	69
630	69
631	71
632	71
633	71
634	71
635	71
636	71
637	71
638	71
639	71
640	71
641	71
642	71
643	71
644	71
645	71
646	71
647	71
648	71
649	71
650	71
651	71
652	71
653	69
654	69
655	69
656	71
657	71
658	71
659	69
660	71
661	71
662	36
663	71
664	71
665	71
666	43
667	43
668	71
669	71
670	71
671	71
672	76
673	77
674	36
675	75
676	75
677	75
678	75
679	78
680	79
681	80
682	71
683	71
684	71
685	71
686	75
687	75
688	71
689	69
690	69
691	71
692	71
693	71
694	71
695	71
696	71
697	81
698	81
699	81
700	81
701	81
702	81
703	81
704	81
705	81
706	81
707	81
708	81
709	81
710	81
711	81
712	81
713	81
714	81
715	81
716	81
717	81
718	81
719	81
720	81
721	81
722	81
723	81
724	81
725	81
726	81
727	81
728	81
729	81
730	81
731	81
732	81
733	81
734	81
735	81
736	81
737	81
738	81
739	81
740	81
741	81
742	81
743	81
744	81
745	81
746	81
747	81
748	82
749	82
750	82
751	82
752	82
753	82
754	82
755	82
756	82
757	82
758	82
759	82
760	82
761	82
762	83
763	83
764	83
765	83
766	83
767	83
768	83
769	83
770	83
771	83
772	83
773	83
774	83
775	83
776	84
777	84
778	84
779	84
780	84
781	84
782	84
783	84
784	84
785	84
786	84
787	84
788	84
789	84
790	71
791	69
792	71
793	71
794	71
795	80
796	71
797	71
798	71
799	71
800	71
801	71
802	71
803	71
804	74
805	74
806	74
807	74
808	74
809	24
810	24
811	24
812	24
813	24
814	24
815	24
816	24
817	24
818	24
819	24
820	24
821	24
822	24
823	24
824	24
825	24
826	24
827	24
828	24
829	24
830	24
831	24
832	24
833	24
834	24
835	24
836	24
837	24
838	24
839	24
840	24
841	24
842	24
843	24
844	24
845	24
846	24
847	24
848	24
849	24
850	24
851	24
852	24
853	24
854	24
855	24
856	24
857	24
858	24
859	24
860	24
861	24
862	24
863	24
864	24
865	24
866	24
867	24
868	24
869	24
870	24
871	24
872	24
873	24
874	24
875	24
876	24
877	24
878	24
879	24
880	24
881	24
882	24
883	24
884	24
885	24
886	24
887	24
888	24
889	24
890	24
891	24
892	24
893	24
894	24
895	24
896	24
897	24
898	24
899	24
900	24
901	49
902	49
903	49
904	49
905	49
906	49
907	49
908	49
909	49
910	49
911	85
912	49
913	49
914	49
915	49
916	49
917	49
918	49
919	49
920	49
921	49
922	49
923	49
924	49
925	49
926	3
927	3
928	3
929	3
930	6
931	6
932	3
933	6
934	86
935	48
936	6
937	6
938	3
939	6
940	6
941	6
942	80
943	80
944	80
945	80
946	80
947	3
948	80
949	80
950	80
951	80
952	80
953	80
954	80
955	80
956	43
957	87
958	87
959	7
960	87
961	43
962	43
963	43
964	43
965	87
966	88
967	87
968	87
969	88
970	87
971	87
972	26
973	26
974	26
975	26
976	26
977	26
978	26
979	26
980	26
981	26
982	26
983	26
984	89
985	89
986	26
987	26
988	90
989	26
990	26
991	26
992	26
993	26
994	89
995	26
996	26
997	26
998	26
999	26
1000	26
1001	26
1002	26
1003	26
1004	26
1005	26
1006	26
1007	26
1008	26
1009	26
1010	26
1011	26
1012	26
1013	26
1014	26
1015	26
1016	26
1017	26
1018	26
1019	26
1020	91
1021	91
1022	91
1023	91
1024	91
1025	91
1026	91
1027	34
1028	34
1029	34
1030	34
1031	34
1032	34
1033	34
1034	12
1035	34
1036	34
1037	34
1038	34
1039	34
1040	34
1041	34
1042	34
1043	19
1044	4
1045	4
1046	19
1047	92
1048	92
1049	4
1050	4
1051	4
1052	4
1053	4
1054	4
1055	4
1056	4
1057	4
1058	1
1059	49
1060	4
1061	4
1062	4
1063	35
1064	4
1065	4
1066	4
1067	4
1068	15
1069	14
1070	93
1071	14
1072	14
1073	93
1074	63
1075	94
1076	4
1077	4
1078	30
1079	64
1080	64
1081	64
1082	64
1083	64
1084	63
1085	63
1086	63
1087	63
1088	63
1089	63
1090	63
1091	64
1092	95
1093	89
1094	63
1095	63
1096	63
1097	14
1098	63
1099	51
1100	63
1101	93
1102	14
1103	63
1104	19
1105	14
1106	96
1107	33
1108	33
1109	51
1110	63
1111	63
1112	30
1113	63
1114	14
1115	63
1116	63
1117	51
1118	97
1119	64
1120	93
1121	14
1122	33
1123	63
1124	31
1125	97
1126	31
1127	98
1128	7
1129	7
1130	7
1131	7
1132	99
1133	7
1134	7
1135	100
1136	43
1137	99
1138	7
1139	7
1140	7
1141	68
1142	7
1143	7
1144	7
1145	7
1146	7
1147	7
1148	7
1149	43
1150	43
1151	43
1152	60
1153	7
1154	101
1155	7
1156	7
1157	7
1158	7
1159	100
1160	43
1161	100
1162	43
1163	43
1164	100
1165	43
1166	100
1167	43
1168	43
1169	43
1170	43
1171	43
1172	43
1173	100
1174	100
1175	100
1176	100
1177	100
1178	100
1179	100
1180	100
1181	100
1182	100
1183	100
1184	100
1185	43
1186	100
1187	100
1188	100
1189	100
1190	100
1191	100
1192	100
1193	100
1194	13
1195	100
1196	24
1197	24
1198	24
1199	66
1200	66
1201	24
1202	66
1203	24
1204	24
1205	24
1206	24
1207	24
1208	24
1209	24
1210	24
1211	24
1212	24
1213	24
1214	24
1215	24
1216	24
1217	24
1218	24
1219	24
1220	24
1221	24
1222	24
1223	24
1224	24
1225	24
1226	24
1227	24
1228	24
1229	24
1230	24
1231	24
1232	24
1233	24
1234	24
1235	24
1236	24
1237	24
1238	24
1239	24
1240	24
1241	24
1242	24
1243	24
1244	24
1245	24
1246	24
1247	24
1248	67
1249	24
1250	24
1251	24
1252	24
1253	24
1254	24
1255	24
1256	24
1257	24
1258	24
1259	24
1260	24
1261	24
1262	24
1263	24
1264	24
1265	24
1266	24
1267	24
1268	24
1269	24
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_images (id, url, key, is_primary, "order", product_id, created_at, updated_at) FROM stdin;
30	http://localhost:3000/uploads/2024/05/28521-01.jpg	imported/28521/0	t	0	20	2025-10-24 00:47:00.986203	2025-10-24 00:47:00.986203
31	http://localhost:3000/uploads/2024/05/24079-01.jpg	imported/24079/0	t	0	21	2025-10-24 00:47:01.004454	2025-10-24 00:47:01.004454
32	http://localhost:3000/uploads/2024/05/24283-01.jpg	imported/24283/0	t	0	22	2025-10-24 00:47:01.025926	2025-10-24 00:47:01.025926
33	http://localhost:3000/uploads/2024/05/24149-01-2.jpg	imported/24149/0	t	0	23	2025-10-24 00:47:01.048617	2025-10-24 00:47:01.048617
34	http://localhost:3000/uploads/2024/05/24149-01-1.jpg	imported/24149/1	f	1	23	2025-10-24 00:47:01.053661	2025-10-24 00:47:01.053661
35	http://localhost:3000/uploads/2024/05/24081-01.jpg	imported/24081/0	t	0	24	2025-10-24 00:47:01.073673	2025-10-24 00:47:01.073673
36	http://localhost:3000/uploads/2024/05/24089-01.jpg	imported/24089/0	t	0	25	2025-10-24 00:47:01.112127	2025-10-24 00:47:01.112127
37	http://localhost:3000/uploads/2024/05/24091-01.jpg	imported/24091/0	t	0	26	2025-10-24 00:47:01.132311	2025-10-24 00:47:01.132311
38	http://localhost:3000/uploads/2024/05/24076-01.jpg	imported/24076/0	t	0	27	2025-10-24 00:47:01.151788	2025-10-24 00:47:01.151788
39	http://localhost:3000/uploads/2024/05/24104-01.jpg	imported/24104/0	t	0	28	2025-10-24 00:47:01.170971	2025-10-24 00:47:01.170971
40	http://localhost:3000/uploads/2024/05/22102-01.jpg	imported/22102/0	t	0	29	2025-10-24 00:47:01.190663	2025-10-24 00:47:01.190663
41	http://localhost:3000/uploads/2024/05/27810-01.jpg	imported/27810/0	t	0	30	2025-10-24 00:47:01.230987	2025-10-24 00:47:01.230987
42	http://localhost:3000/uploads/2024/05/27811-01.jpg	imported/27811/0	t	0	31	2025-10-24 00:47:01.251442	2025-10-24 00:47:01.251442
43	http://localhost:3000/uploads/2024/05/24188-01.jpg	imported/24188/0	t	0	32	2025-10-24 00:47:01.270382	2025-10-24 00:47:01.270382
44	http://localhost:3000/uploads/2024/05/26299-01.jpg	imported/26299/0	t	0	33	2025-10-24 00:47:01.290175	2025-10-24 00:47:01.290175
45	http://localhost:3000/uploads/2025/06/26299-02.jpg	imported/26299/1	f	1	33	2025-10-24 00:47:01.295143	2025-10-24 00:47:01.295143
46	http://localhost:3000/uploads/2025/06/26299-03.jpg	imported/26299/2	f	2	33	2025-10-24 00:47:01.299971	2025-10-24 00:47:01.299971
47	http://localhost:3000/uploads/2025/06/26299-04.jpg	imported/26299/3	f	3	33	2025-10-24 00:47:01.304669	2025-10-24 00:47:01.304669
48	http://localhost:3000/uploads/2025/06/26299-05.jpg	imported/26299/4	f	4	33	2025-10-24 00:47:01.309323	2025-10-24 00:47:01.309323
49	http://localhost:3000/uploads/2024/05/34657-01.jpg	imported/34657/0	t	0	34	2025-10-24 00:47:01.329021	2025-10-24 00:47:01.329021
50	http://localhost:3000/uploads/2024/05/28231-01.jpg	imported/28231/0	t	0	35	2025-10-24 00:47:01.347267	2025-10-24 00:47:01.347267
51	http://localhost:3000/uploads/2024/05/20886-01.jpg	imported/20886/0	t	0	36	2025-10-24 00:47:01.365267	2025-10-24 00:47:01.365267
52	http://localhost:3000/uploads/2024/05/10914-01.jpg	imported/10914/0	t	0	37	2025-10-24 00:47:01.384396	2025-10-24 00:47:01.384396
53	http://localhost:3000/uploads/2024/05/10910-01.jpg	imported/10910/0	t	0	38	2025-10-24 00:47:01.404427	2025-10-24 00:47:01.404427
54	http://localhost:3000/uploads/2024/05/10909-01.jpg	imported/10909/0	t	0	39	2025-10-24 00:47:01.423385	2025-10-24 00:47:01.423385
55	http://localhost:3000/uploads/2024/05/10916-01.jpg	imported/10916/0	t	0	40	2025-10-24 00:47:01.440571	2025-10-24 00:47:01.440571
56	http://localhost:3000/uploads/2024/05/27254-01.jpg	imported/27254/0	t	0	41	2025-10-24 00:47:01.459053	2025-10-24 00:47:01.459053
57	http://localhost:3000/uploads/2024/08/26954-01.jpg	imported/26954/0	t	0	42	2025-10-24 00:47:01.479224	2025-10-24 00:47:01.479224
58	http://localhost:3000/uploads/2024/05/34013-01.jpg	imported/34013/0	t	0	43	2025-10-24 00:47:01.497306	2025-10-24 00:47:01.497306
59	http://localhost:3000/uploads/2024/05/21779-01.jpg	imported/21779/0	t	0	44	2025-10-24 00:47:01.515857	2025-10-24 00:47:01.515857
60	http://localhost:3000/uploads/2024/05/33776-01.jpg	imported/33776/0	t	0	45	2025-10-24 00:47:01.536183	2025-10-24 00:47:01.536183
61	http://localhost:3000/uploads/2024/05/28519-01.jpg	imported/28519/0	t	0	46	2025-10-24 00:47:01.555055	2025-10-24 00:47:01.555055
62	http://localhost:3000/uploads/2024/05/28963-01.jpg	imported/28963/0	t	0	47	2025-10-24 00:47:01.577933	2025-10-24 00:47:01.577933
63	http://localhost:3000/uploads/2024/05/26464-01.jpg	imported/26464/0	t	0	48	2025-10-24 00:47:01.599227	2025-10-24 00:47:01.599227
64	http://localhost:3000/uploads/2024/05/34101-01.jpg	imported/34101/0	t	0	49	2025-10-24 00:47:01.617613	2025-10-24 00:47:01.617613
65	http://localhost:3000/uploads/2024/05/26282-01.jpg	imported/26282/0	t	0	50	2025-10-24 00:47:01.637125	2025-10-24 00:47:01.637125
66	http://localhost:3000/uploads/2024/05/23050-01.jpg	imported/23050/0	t	0	51	2025-10-24 00:47:01.65726	2025-10-24 00:47:01.65726
67	http://localhost:3000/uploads/2024/05/33771-01.jpg	imported/33771/0	t	0	52	2025-10-24 00:47:01.676551	2025-10-24 00:47:01.676551
68	http://localhost:3000/uploads/2024/05/28595-01.jpg	imported/28595/0	t	0	53	2025-10-24 00:47:01.695864	2025-10-24 00:47:01.695864
69	http://localhost:3000/uploads/2024/05/24446-01.jpg	imported/24446/0	t	0	54	2025-10-24 00:47:01.714625	2025-10-24 00:47:01.714625
70	http://localhost:3000/uploads/2024/05/20002-01.jpg	imported/20002/0	t	0	55	2025-10-24 00:47:01.749752	2025-10-24 00:47:01.749752
71	http://localhost:3000/uploads/2024/05/34100-01.jpg	imported/34100/0	t	0	56	2025-10-24 00:47:01.76768	2025-10-24 00:47:01.76768
72	http://localhost:3000/uploads/2024/05/39264-01.jpg	imported/39264/0	t	0	57	2025-10-24 00:47:01.785031	2025-10-24 00:47:01.785031
73	http://localhost:3000/uploads/2024/05/39260-01.jpg	imported/39260/0	t	0	58	2025-10-24 00:47:01.802161	2025-10-24 00:47:01.802161
74	http://localhost:3000/uploads/2024/05/39263-01.jpg	imported/39263/0	t	0	59	2025-10-24 00:47:01.826115	2025-10-24 00:47:01.826115
75	http://localhost:3000/uploads/2024/05/39259-01.jpg	imported/39259/0	t	0	60	2025-10-24 00:47:01.84365	2025-10-24 00:47:01.84365
76	http://localhost:3000/uploads/2024/05/39267-01.jpg	imported/39267/0	t	0	61	2025-10-24 00:47:01.862723	2025-10-24 00:47:01.862723
77	http://localhost:3000/uploads/2024/05/39265-01.jpg	imported/39265/0	t	0	62	2025-10-24 00:47:01.882417	2025-10-24 00:47:01.882417
78	http://localhost:3000/uploads/2024/05/31124-01.jpg	imported/31124/0	t	0	63	2025-10-24 00:47:01.900204	2025-10-24 00:47:01.900204
79	http://localhost:3000/uploads/2024/05/31127-01.jpg	imported/31127/0	t	0	64	2025-10-24 00:47:01.916988	2025-10-24 00:47:01.916988
80	http://localhost:3000/uploads/2024/05/31125-01.jpg	imported/31125/0	t	0	65	2025-10-24 00:47:01.933838	2025-10-24 00:47:01.933838
81	http://localhost:3000/uploads/2024/06/25212-01.jpg	imported/25212/0	t	0	66	2025-10-24 00:47:01.952494	2025-10-24 00:47:01.952494
82	http://localhost:3000/uploads/2024/06/20991-01.jpg	imported/20991/0	t	0	67	2025-10-24 00:47:01.97299	2025-10-24 00:47:01.97299
83	http://localhost:3000/uploads/2024/06/20997-01.jpg	imported/20997/0	t	0	68	2025-10-24 00:47:01.991412	2025-10-24 00:47:01.991412
84	http://localhost:3000/uploads/2025/05/20997-02.jpg	imported/20997/1	f	1	68	2025-10-24 00:47:01.995802	2025-10-24 00:47:01.995802
85	http://localhost:3000/uploads/2025/05/20997-03.jpg	imported/20997/2	f	2	68	2025-10-24 00:47:02.000096	2025-10-24 00:47:02.000096
86	http://localhost:3000/uploads/2025/05/20997-04.jpg	imported/20997/3	f	3	68	2025-10-24 00:47:02.004708	2025-10-24 00:47:02.004708
87	http://localhost:3000/uploads/2024/06/25211-01.jpg	imported/25211/0	t	0	69	2025-10-24 00:47:02.02641	2025-10-24 00:47:02.02641
88	http://localhost:3000/uploads/2024/06/25970-01.jpg	imported/25970/0	t	0	70	2025-10-24 00:47:02.046926	2025-10-24 00:47:02.046926
89	http://localhost:3000/uploads/2024/06/22641-01.jpg	imported/22641/0	t	0	71	2025-10-24 00:47:02.065242	2025-10-24 00:47:02.065242
90	http://localhost:3000/uploads/2024/06/23128-01.jpg	imported/23128/0	t	0	72	2025-10-24 00:47:02.083097	2025-10-24 00:47:02.083097
91	http://localhost:3000/uploads/2024/06/24246-01.jpg	imported/24246/0	t	0	73	2025-10-24 00:47:02.102356	2025-10-24 00:47:02.102356
92	http://localhost:3000/uploads/2024/06/24246-02.jpg	imported/24246/1	f	1	73	2025-10-24 00:47:02.106858	2025-10-24 00:47:02.106858
93	http://localhost:3000/uploads/2024/06/24246-03.jpg	imported/24246/2	f	2	73	2025-10-24 00:47:02.111216	2025-10-24 00:47:02.111216
94	http://localhost:3000/uploads/2024/06/24364-01.jpg	imported/24364/0	t	0	74	2025-10-24 00:47:02.132386	2025-10-24 00:47:02.132386
95	http://localhost:3000/uploads/2024/06/24364-02.jpg	imported/24364/1	f	1	74	2025-10-24 00:47:02.137405	2025-10-24 00:47:02.137405
96	http://localhost:3000/uploads/2024/06/24927-01.jpg	imported/24927/0	t	0	75	2025-10-24 00:47:02.157879	2025-10-24 00:47:02.157879
97	http://localhost:3000/uploads/2024/06/24927-02.jpg	imported/24927/1	f	1	75	2025-10-24 00:47:02.162739	2025-10-24 00:47:02.162739
98	http://localhost:3000/uploads/2024/06/26033-01.jpg	imported/26033/0	t	0	76	2025-10-24 00:47:02.179988	2025-10-24 00:47:02.179988
99	http://localhost:3000/uploads/2024/06/26033-02.jpg	imported/26033/1	f	1	76	2025-10-24 00:47:02.184309	2025-10-24 00:47:02.184309
100	http://localhost:3000/uploads/2024/06/27406-01.jpg	imported/27406/0	t	0	77	2025-10-24 00:47:02.200441	2025-10-24 00:47:02.200441
101	http://localhost:3000/uploads/2024/06/28270-01.jpg	imported/28270/0	t	0	78	2025-10-24 00:47:02.217997	2025-10-24 00:47:02.217997
102	http://localhost:3000/uploads/2024/06/28274-01.jpg	imported/28274/0	t	0	79	2025-10-24 00:47:02.234627	2025-10-24 00:47:02.234627
103	http://localhost:3000/uploads/2024/06/28274-02.jpg	imported/28274/1	f	1	79	2025-10-24 00:47:02.238642	2025-10-24 00:47:02.238642
104	http://localhost:3000/uploads/2024/06/28518-01.jpg	imported/28518/0	t	0	80	2025-10-24 00:47:02.255973	2025-10-24 00:47:02.255973
105	http://localhost:3000/uploads/2024/06/28518-02.jpg	imported/28518/1	f	1	80	2025-10-24 00:47:02.259862	2025-10-24 00:47:02.259862
106	http://localhost:3000/uploads/2024/06/29620-01.jpg	imported/29620/0	t	0	81	2025-10-24 00:47:02.277236	2025-10-24 00:47:02.277236
107	http://localhost:3000/uploads/2024/06/29620-02.jpg	imported/29620/1	f	1	81	2025-10-24 00:47:02.299398	2025-10-24 00:47:02.299398
108	http://localhost:3000/uploads/2024/06/29641-01.jpg	imported/29641/0	t	0	82	2025-10-24 00:47:02.315957	2025-10-24 00:47:02.315957
109	http://localhost:3000/uploads/2024/06/29641-02.jpg	imported/29641/1	f	1	82	2025-10-24 00:47:02.320499	2025-10-24 00:47:02.320499
110	http://localhost:3000/uploads/2024/06/29641-03.jpg	imported/29641/2	f	2	82	2025-10-24 00:47:02.326792	2025-10-24 00:47:02.326792
111	http://localhost:3000/uploads/2024/06/31284-01.jpg	imported/31284/0	t	0	83	2025-10-24 00:47:02.349062	2025-10-24 00:47:02.349062
112	http://localhost:3000/uploads/2024/06/31296-01.jpg	imported/31296/0	t	0	84	2025-10-24 00:47:02.371483	2025-10-24 00:47:02.371483
113	http://localhost:3000/uploads/2024/06/31296-02.jpg	imported/31296/1	f	1	84	2025-10-24 00:47:02.376645	2025-10-24 00:47:02.376645
114	http://localhost:3000/uploads/2024/06/29988-01.jpg	imported/29988/0	t	0	85	2025-10-24 00:47:02.398079	2025-10-24 00:47:02.398079
115	http://localhost:3000/uploads/2024/06/29988-02.jpg	imported/29988/1	f	1	85	2025-10-24 00:47:02.40229	2025-10-24 00:47:02.40229
116	http://localhost:3000/uploads/2024/06/31297-01.jpg	imported/31297/0	t	0	86	2025-10-24 00:47:02.424868	2025-10-24 00:47:02.424868
117	http://localhost:3000/uploads/2024/06/31297-02.jpg	imported/31297/1	f	1	86	2025-10-24 00:47:02.429678	2025-10-24 00:47:02.429678
118	http://localhost:3000/uploads/2024/06/30291-01.jpg	imported/30291/0	t	0	87	2025-10-24 00:47:02.446971	2025-10-24 00:47:02.446971
119	http://localhost:3000/uploads/2024/06/30291-02.jpg	imported/30291/1	f	1	87	2025-10-24 00:47:02.4509	2025-10-24 00:47:02.4509
120	http://localhost:3000/uploads/2024/06/31406-01.jpg	imported/31406/0	t	0	88	2025-10-24 00:47:02.470271	2025-10-24 00:47:02.470271
121	http://localhost:3000/uploads/2024/06/31406-02.jpg	imported/31406/1	f	1	88	2025-10-24 00:47:02.475204	2025-10-24 00:47:02.475204
122	http://localhost:3000/uploads/2024/06/30292-01.jpg	imported/30292/0	t	0	89	2025-10-24 00:47:02.494763	2025-10-24 00:47:02.494763
123	http://localhost:3000/uploads/2024/06/30292-02.jpg	imported/30292/1	f	1	89	2025-10-24 00:47:02.499598	2025-10-24 00:47:02.499598
124	http://localhost:3000/uploads/2024/06/31438-01.jpg	imported/31438/0	t	0	90	2025-10-24 00:47:02.517051	2025-10-24 00:47:02.517051
125	http://localhost:3000/uploads/2024/06/31570-01.jpg	imported/31570/0	t	0	91	2025-10-24 00:47:02.534695	2025-10-24 00:47:02.534695
126	http://localhost:3000/uploads/2024/06/30293-01.jpg	imported/30293/0	t	0	92	2025-10-24 00:47:02.550991	2025-10-24 00:47:02.550991
127	http://localhost:3000/uploads/2024/06/30293-02.jpg	imported/30293/1	f	1	92	2025-10-24 00:47:02.554952	2025-10-24 00:47:02.554952
128	http://localhost:3000/uploads/2024/06/31654-01-1.jpg	imported/31654/0	t	0	93	2025-10-24 00:47:02.573602	2025-10-24 00:47:02.573602
129	http://localhost:3000/uploads/2024/06/31699-01.jpg	imported/31699/0	t	0	94	2025-10-24 00:47:02.591869	2025-10-24 00:47:02.591869
130	http://localhost:3000/uploads/2024/06/32363-01.jpg	imported/32363/0	t	0	95	2025-10-24 00:47:02.609176	2025-10-24 00:47:02.609176
131	http://localhost:3000/uploads/2024/06/32372-01.jpg	imported/32372/0	t	0	96	2025-10-24 00:47:02.628568	2025-10-24 00:47:02.628568
132	http://localhost:3000/uploads/2024/06/32372-02.jpg	imported/32372/1	f	1	96	2025-10-24 00:47:02.633622	2025-10-24 00:47:02.633622
133	http://localhost:3000/uploads/2024/06/32476-01.jpg	imported/32476/0	t	0	97	2025-10-24 00:47:02.656166	2025-10-24 00:47:02.656166
134	http://localhost:3000/uploads/2024/06/32578-01-1.jpg	imported/32578/0	t	0	98	2025-10-24 00:47:02.675305	2025-10-24 00:47:02.675305
135	http://localhost:3000/uploads/2024/06/32578-02-1.jpg	imported/32578/1	f	1	98	2025-10-24 00:47:02.679479	2025-10-24 00:47:02.679479
136	http://localhost:3000/uploads/2024/06/33002-01.jpg	imported/33002/0	t	0	99	2025-10-24 00:47:02.696983	2025-10-24 00:47:02.696983
137	http://localhost:3000/uploads/2024/06/33002-02.jpg	imported/33002/1	f	1	99	2025-10-24 00:47:02.70133	2025-10-24 00:47:02.70133
138	http://localhost:3000/uploads/2024/06/33144-01.jpg	imported/33144/0	t	0	100	2025-10-24 00:47:02.718214	2025-10-24 00:47:02.718214
139	http://localhost:3000/uploads/2024/06/33144-02.jpg	imported/33144/1	f	1	100	2025-10-24 00:47:02.722214	2025-10-24 00:47:02.722214
140	http://localhost:3000/uploads/2024/06/33389-01.jpg	imported/33389/0	t	0	101	2025-10-24 00:47:02.740404	2025-10-24 00:47:02.740404
141	http://localhost:3000/uploads/2024/06/33392-01.jpg	imported/33392/0	t	0	102	2025-10-24 00:47:02.761584	2025-10-24 00:47:02.761584
142	http://localhost:3000/uploads/2024/06/33393-01.jpg	imported/33393/0	t	0	103	2025-10-24 00:47:02.778841	2025-10-24 00:47:02.778841
143	http://localhost:3000/uploads/2024/06/33459-01.jpg	imported/33459/0	t	0	104	2025-10-24 00:47:02.798328	2025-10-24 00:47:02.798328
144	http://localhost:3000/uploads/2024/06/33459-02.jpg	imported/33459/1	f	1	104	2025-10-24 00:47:02.802947	2025-10-24 00:47:02.802947
145	http://localhost:3000/uploads/2024/06/33509-01.jpg	imported/33509/0	t	0	105	2025-10-24 00:47:02.822604	2025-10-24 00:47:02.822604
146	http://localhost:3000/uploads/2024/06/33639-01.jpg	imported/33639/0	t	0	106	2025-10-24 00:47:02.861079	2025-10-24 00:47:02.861079
147	http://localhost:3000/uploads/2024/06/33639-02.jpg	imported/33639/1	f	1	106	2025-10-24 00:47:02.865623	2025-10-24 00:47:02.865623
148	http://localhost:3000/uploads/2024/06/33658-01.jpg	imported/33658/0	t	0	107	2025-10-24 00:47:02.884411	2025-10-24 00:47:02.884411
149	http://localhost:3000/uploads/2024/06/33658-02.jpg	imported/33658/1	f	1	107	2025-10-24 00:47:02.888905	2025-10-24 00:47:02.888905
150	http://localhost:3000/uploads/2024/06/33666-01.jpg	imported/33666/0	t	0	108	2025-10-24 00:47:02.907495	2025-10-24 00:47:02.907495
151	http://localhost:3000/uploads/2024/06/33666-02.jpg	imported/33666/1	f	1	108	2025-10-24 00:47:02.912204	2025-10-24 00:47:02.912204
152	http://localhost:3000/uploads/2024/06/33691-01.jpg	imported/33691/0	t	0	109	2025-10-24 00:47:02.93295	2025-10-24 00:47:02.93295
153	http://localhost:3000/uploads/2024/06/33691-02.jpg	imported/33691/1	f	1	109	2025-10-24 00:47:02.93738	2025-10-24 00:47:02.93738
154	http://localhost:3000/uploads/2024/06/33796-01.jpg	imported/33796/0	t	0	110	2025-10-24 00:47:02.954058	2025-10-24 00:47:02.954058
155	http://localhost:3000/uploads/2024/06/33796-02.jpg	imported/33796/1	f	1	110	2025-10-24 00:47:02.95838	2025-10-24 00:47:02.95838
156	http://localhost:3000/uploads/2024/06/33925-01.jpg	imported/33925/0	t	0	111	2025-10-24 00:47:02.976211	2025-10-24 00:47:02.976211
157	http://localhost:3000/uploads/2024/06/33925-02.jpg	imported/33925/1	f	1	111	2025-10-24 00:47:02.980778	2025-10-24 00:47:02.980778
158	http://localhost:3000/uploads/2024/06/33991-01.jpg	imported/33991/0	t	0	112	2025-10-24 00:47:03.001535	2025-10-24 00:47:03.001535
159	http://localhost:3000/uploads/2024/06/33991-02.jpg	imported/33991/1	f	1	112	2025-10-24 00:47:03.005408	2025-10-24 00:47:03.005408
160	http://localhost:3000/uploads/2024/06/33992-01.jpg	imported/33992/0	t	0	113	2025-10-24 00:47:03.022437	2025-10-24 00:47:03.022437
161	http://localhost:3000/uploads/2024/06/33992-02.jpg	imported/33992/1	f	1	113	2025-10-24 00:47:03.026712	2025-10-24 00:47:03.026712
162	http://localhost:3000/uploads/2024/06/22353-01.jpg	imported/22353/0	t	0	114	2025-10-24 00:47:03.042681	2025-10-24 00:47:03.042681
163	http://localhost:3000/uploads/2024/06/27659-01.jpg	imported/27659/0	t	0	115	2025-10-24 00:47:03.058353	2025-10-24 00:47:03.058353
164	http://localhost:3000/uploads/2024/06/28251-01.jpg	imported/28251/0	t	0	116	2025-10-24 00:47:03.07436	2025-10-24 00:47:03.07436
165	http://localhost:3000/uploads/2024/06/30518-01.jpg	imported/30518/0	t	0	117	2025-10-24 00:47:03.091315	2025-10-24 00:47:03.091315
166	http://localhost:3000/uploads/2024/06/30523-01.jpg	imported/30523/0	t	0	118	2025-10-24 00:47:03.108319	2025-10-24 00:47:03.108319
167	http://localhost:3000/uploads/2024/06/30820-01.jpg	imported/30820/0	t	0	119	2025-10-24 00:47:03.124526	2025-10-24 00:47:03.124526
168	http://localhost:3000/uploads/2024/06/35558-01.jpg	imported/35558/0	t	0	120	2025-10-24 00:47:03.140099	2025-10-24 00:47:03.140099
169	http://localhost:3000/uploads/2024/06/38120-01.jpg	imported/38120/0	t	0	121	2025-10-24 00:47:03.156543	2025-10-24 00:47:03.156543
170	http://localhost:3000/uploads/2024/06/38140-01.jpg	imported/38140/0	t	0	122	2025-10-24 00:47:03.171884	2025-10-24 00:47:03.171884
171	http://localhost:3000/uploads/2024/06/38155-01.jpg	imported/38155/0	t	0	123	2025-10-24 00:47:03.187343	2025-10-24 00:47:03.187343
172	http://localhost:3000/uploads/2024/06/39012-01.jpg	imported/39012/0	t	0	124	2025-10-24 00:47:03.203716	2025-10-24 00:47:03.203716
173	http://localhost:3000/uploads/2024/06/39150-01.jpg	imported/39150/0	t	0	125	2025-10-24 00:47:03.221992	2025-10-24 00:47:03.221992
174	http://localhost:3000/uploads/2024/06/39160-01.jpg	imported/39160/0	t	0	126	2025-10-24 00:47:03.238161	2025-10-24 00:47:03.238161
175	http://localhost:3000/uploads/2024/06/39170-01.jpg	imported/39170/0	t	0	127	2025-10-24 00:47:03.257146	2025-10-24 00:47:03.257146
176	http://localhost:3000/uploads/2024/06/39171-01.jpg	imported/39171/0	t	0	128	2025-10-24 00:47:03.278245	2025-10-24 00:47:03.278245
177	http://localhost:3000/uploads/2024/06/39175-01.jpg	imported/39175/0	t	0	129	2025-10-24 00:47:03.299056	2025-10-24 00:47:03.299056
178	http://localhost:3000/uploads/2024/06/39180-01.jpg	imported/39180/0	t	0	130	2025-10-24 00:47:03.320288	2025-10-24 00:47:03.320288
179	http://localhost:3000/uploads/2024/07/10005-01.jpg	imported/10005/0	t	0	131	2025-10-24 00:47:03.340044	2025-10-24 00:47:03.340044
180	http://localhost:3000/uploads/2024/07/10008-01.jpg	imported/10008/0	t	0	132	2025-10-24 00:47:03.35929	2025-10-24 00:47:03.35929
181	http://localhost:3000/uploads/2024/07/10373-01.jpg	imported/10373/0	t	0	133	2025-10-24 00:47:03.38052	2025-10-24 00:47:03.38052
182	http://localhost:3000/uploads/2024/07/10627-01.jpg	imported/10627/0	t	0	134	2025-10-24 00:47:03.417577	2025-10-24 00:47:03.417577
183	http://localhost:3000/uploads/2024/07/10628-01.jpg	imported/10628/0	t	0	135	2025-10-24 00:47:03.435487	2025-10-24 00:47:03.435487
184	http://localhost:3000/uploads/2024/07/10629-01.jpg	imported/10629/0	t	0	136	2025-10-24 00:47:03.452158	2025-10-24 00:47:03.452158
185	http://localhost:3000/uploads/2024/07/10630-01.jpg	imported/10630/0	t	0	137	2025-10-24 00:47:03.471028	2025-10-24 00:47:03.471028
186	http://localhost:3000/uploads/2024/08/10631-01-1.jpg	imported/10631/0	t	0	138	2025-10-24 00:47:03.48828	2025-10-24 00:47:03.48828
187	http://localhost:3000/uploads/2024/07/10830-01.jpg	imported/10830/0	t	0	139	2025-10-24 00:47:03.504031	2025-10-24 00:47:03.504031
188	http://localhost:3000/uploads/2024/07/10915-01.jpg	imported/10915/0	t	0	140	2025-10-24 00:47:03.520492	2025-10-24 00:47:03.520492
189	http://localhost:3000/uploads/2024/07/21944-01.jpg	imported/21944/0	t	0	141	2025-10-24 00:47:03.537724	2025-10-24 00:47:03.537724
190	http://localhost:3000/uploads/2024/07/22178-01.jpg	imported/22178/0	t	0	142	2025-10-24 00:47:03.55969	2025-10-24 00:47:03.55969
191	http://localhost:3000/uploads/2024/07/22666-01.jpg	imported/22666/0	t	0	143	2025-10-24 00:47:03.576246	2025-10-24 00:47:03.576246
192	http://localhost:3000/uploads/2024/07/22941-01.jpg	imported/22941/0	t	0	144	2025-10-24 00:47:03.59663	2025-10-24 00:47:03.59663
193	http://localhost:3000/uploads/2024/07/23130-01.jpg	imported/23130/0	t	0	145	2025-10-24 00:47:03.614598	2025-10-24 00:47:03.614598
194	http://localhost:3000/uploads/2024/07/24424-01.jpg	imported/24424/0	t	0	146	2025-10-24 00:47:03.631323	2025-10-24 00:47:03.631323
195	http://localhost:3000/uploads/2024/07/24449-01.jpg	imported/24449/0	t	0	147	2025-10-24 00:47:03.649347	2025-10-24 00:47:03.649347
196	http://localhost:3000/uploads/2024/07/24500-01.jpg	imported/24500/0	t	0	148	2025-10-24 00:47:03.665355	2025-10-24 00:47:03.665355
197	http://localhost:3000/uploads/2024/08/25415-01-2.jpg	imported/25415/0	t	0	149	2025-10-24 00:47:03.680793	2025-10-24 00:47:03.680793
198	http://localhost:3000/uploads/2024/07/26933-01.jpg	imported/26933/0	t	0	151	2025-10-24 00:47:03.702562	2025-10-24 00:47:03.702562
199	http://localhost:3000/uploads/2024/07/26933-02.jpg	imported/26933/1	f	1	151	2025-10-24 00:47:03.706253	2025-10-24 00:47:03.706253
200	http://localhost:3000/uploads/2024/07/27770-01.jpg	imported/27770/0	t	0	152	2025-10-24 00:47:03.721292	2025-10-24 00:47:03.721292
201	http://localhost:3000/uploads/2024/07/28172-01.jpg	imported/28172/0	t	0	153	2025-10-24 00:47:03.737648	2025-10-24 00:47:03.737648
202	http://localhost:3000/uploads/2024/07/28297-01.jpg	imported/28297/0	t	0	154	2025-10-24 00:47:03.754844	2025-10-24 00:47:03.754844
203	http://localhost:3000/uploads/2024/07/28622-01.jpg	imported/28622/0	t	0	155	2025-10-24 00:47:03.77045	2025-10-24 00:47:03.77045
204	http://localhost:3000/uploads/2024/07/29112-01.jpg	imported/29112/0	t	0	156	2025-10-24 00:47:03.786778	2025-10-24 00:47:03.786778
205	http://localhost:3000/uploads/2024/07/31432-01.jpg	imported/31432/0	t	0	157	2025-10-24 00:47:03.802374	2025-10-24 00:47:03.802374
206	http://localhost:3000/uploads/2024/07/32400-01.jpg	imported/32400/0	t	0	158	2025-10-24 00:47:03.817666	2025-10-24 00:47:03.817666
207	http://localhost:3000/uploads/2024/07/11293-01.jpg	imported/11293/0	t	0	159	2025-10-24 00:47:03.832423	2025-10-24 00:47:03.832423
208	http://localhost:3000/uploads/2024/07/11457-01.jpg	imported/11457/0	t	0	160	2025-10-24 00:47:03.847778	2025-10-24 00:47:03.847778
209	http://localhost:3000/uploads/2024/07/11349-01.jpg	imported/11349/0	t	0	161	2025-10-24 00:47:03.864315	2025-10-24 00:47:03.864315
210	http://localhost:3000/uploads/2024/07/11350-01.jpg	imported/11350/0	t	0	162	2025-10-24 00:47:03.880607	2025-10-24 00:47:03.880607
211	http://localhost:3000/uploads/2024/07/11383-01.jpg	imported/11383/0	t	0	163	2025-10-24 00:47:03.914314	2025-10-24 00:47:03.914314
212	http://localhost:3000/uploads/2024/07/11389-01.jpg	imported/11389/0	t	0	164	2025-10-24 00:47:03.931342	2025-10-24 00:47:03.931342
213	http://localhost:3000/uploads/2024/07/11460-01.jpg	imported/11460/0	t	0	165	2025-10-24 00:47:03.94734	2025-10-24 00:47:03.94734
214	http://localhost:3000/uploads/2024/08/11920-01.jpg	imported/11920/0	t	0	166	2025-10-24 00:47:03.964308	2025-10-24 00:47:03.964308
215	http://localhost:3000/uploads/2024/07/20026-01.jpg	imported/20026/0	t	0	167	2025-10-24 00:47:03.98043	2025-10-24 00:47:03.98043
216	http://localhost:3000/uploads/2024/07/33323-01.jpg	imported/33323/0	t	0	168	2025-10-24 00:47:03.997532	2025-10-24 00:47:03.997532
217	http://localhost:3000/uploads/2024/07/33328-01.jpg	imported/33328/0	t	0	169	2025-10-24 00:47:04.013696	2025-10-24 00:47:04.013696
218	http://localhost:3000/uploads/2024/07/33449-01.jpg	imported/33449/0	t	0	170	2025-10-24 00:47:04.029652	2025-10-24 00:47:04.029652
219	http://localhost:3000/uploads/2024/07/33514-01.jpg	imported/33514/0	t	0	171	2025-10-24 00:47:04.045609	2025-10-24 00:47:04.045609
220	http://localhost:3000/uploads/2024/07/33611-01.jpg	imported/33611/0	t	0	172	2025-10-24 00:47:04.061502	2025-10-24 00:47:04.061502
221	http://localhost:3000/uploads/2024/07/33792-01.jpg	imported/33792/0	t	0	173	2025-10-24 00:47:04.081386	2025-10-24 00:47:04.081386
222	http://localhost:3000/uploads/2024/07/33808-01.jpg	imported/33808/0	t	0	174	2025-10-24 00:47:04.096381	2025-10-24 00:47:04.096381
223	http://localhost:3000/uploads/2024/07/33942-01.jpg	imported/33942/0	t	0	175	2025-10-24 00:47:04.111943	2025-10-24 00:47:04.111943
224	http://localhost:3000/uploads/2024/07/34102-01.jpg	imported/34102/0	t	0	176	2025-10-24 00:47:04.128393	2025-10-24 00:47:04.128393
225	http://localhost:3000/uploads/2024/07/34257-01.jpg	imported/34257/0	t	0	177	2025-10-24 00:47:04.144679	2025-10-24 00:47:04.144679
226	http://localhost:3000/uploads/2024/07/34489-01.jpg	imported/34489/0	t	0	178	2025-10-24 00:47:04.159915	2025-10-24 00:47:04.159915
227	http://localhost:3000/uploads/2024/07/34999-01.jpg	imported/34999/0	t	0	179	2025-10-24 00:47:04.174864	2025-10-24 00:47:04.174864
228	http://localhost:3000/uploads/2024/08/35839-01.jpg	imported/35839/0	t	0	180	2025-10-24 00:47:04.189759	2025-10-24 00:47:04.189759
229	http://localhost:3000/uploads/2024/07/35846-01.jpg	imported/35846/0	t	0	181	2025-10-24 00:47:04.206863	2025-10-24 00:47:04.206863
230	http://localhost:3000/uploads/2024/07/35854-01.jpg	imported/35854/0	t	0	182	2025-10-24 00:47:04.222893	2025-10-24 00:47:04.222893
231	http://localhost:3000/uploads/2024/08/35859-01.jpg	imported/35859/0	t	0	183	2025-10-24 00:47:04.238431	2025-10-24 00:47:04.238431
232	http://localhost:3000/uploads/2024/07/20233-01.jpg	imported/20233/0	t	0	184	2025-10-24 00:47:04.253667	2025-10-24 00:47:04.253667
233	http://localhost:3000/uploads/2024/07/20233-02.jpg	imported/20233/1	f	1	184	2025-10-24 00:47:04.257346	2025-10-24 00:47:04.257346
234	http://localhost:3000/uploads/2024/07/20290-01.jpg	imported/20290/0	t	0	185	2025-10-24 00:47:04.27275	2025-10-24 00:47:04.27275
235	http://localhost:3000/uploads/2024/07/20299-01.jpg	imported/20299/0	t	0	186	2025-10-24 00:47:04.288359	2025-10-24 00:47:04.288359
236	http://localhost:3000/uploads/2024/07/20722-01.jpg	imported/20722/0	t	0	187	2025-10-24 00:47:04.306068	2025-10-24 00:47:04.306068
237	http://localhost:3000/uploads/2024/07/20900-01.jpg	imported/20900/0	t	0	188	2025-10-24 00:47:04.323216	2025-10-24 00:47:04.323216
238	http://localhost:3000/uploads/2024/07/21016-01.jpg	imported/21016/0	t	0	189	2025-10-24 00:47:04.341567	2025-10-24 00:47:04.341567
239	http://localhost:3000/uploads/2024/07/21809-01.jpg	imported/21809/0	t	0	190	2025-10-24 00:47:04.358743	2025-10-24 00:47:04.358743
240	http://localhost:3000/uploads/2024/07/21845-01.jpg	imported/21845/0	t	0	191	2025-10-24 00:47:04.374634	2025-10-24 00:47:04.374634
241	http://localhost:3000/uploads/2024/08/10025-01.jpg	imported/10025/0	t	0	192	2025-10-24 00:47:04.390684	2025-10-24 00:47:04.390684
242	http://localhost:3000/uploads/2024/08/10141-01.jpg	imported/10141/0	t	0	193	2025-10-24 00:47:04.40623	2025-10-24 00:47:04.40623
243	http://localhost:3000/uploads/2024/08/10149-01.jpg	imported/10149/0	t	0	194	2025-10-24 00:47:04.440355	2025-10-24 00:47:04.440355
244	http://localhost:3000/uploads/2024/08/10191-01.jpg	imported/10191/0	t	0	195	2025-10-24 00:47:04.456866	2025-10-24 00:47:04.456866
245	http://localhost:3000/uploads/2024/08/10238-01.jpg	imported/10238/0	t	0	196	2025-10-24 00:47:04.473344	2025-10-24 00:47:04.473344
246	http://localhost:3000/uploads/2024/08/10240-01.jpg	imported/10240/0	t	0	197	2025-10-24 00:47:04.489464	2025-10-24 00:47:04.489464
247	http://localhost:3000/uploads/2024/08/10242-01.jpg	imported/10242/0	t	0	198	2025-10-24 00:47:04.505531	2025-10-24 00:47:04.505531
248	http://localhost:3000/uploads/2024/08/10247-01.jpg	imported/10247/0	t	0	199	2025-10-24 00:47:04.520881	2025-10-24 00:47:04.520881
249	http://localhost:3000/uploads/2024/08/10249-01-1.jpg	imported/10249/0	t	0	200	2025-10-24 00:47:04.535594	2025-10-24 00:47:04.535594
250	http://localhost:3000/uploads/2024/08/10250-01-1.jpg	imported/10250/0	t	0	201	2025-10-24 00:47:04.55086	2025-10-24 00:47:04.55086
251	http://localhost:3000/uploads/2024/08/10251-01.jpg	imported/10251/0	t	0	202	2025-10-24 00:47:04.56668	2025-10-24 00:47:04.56668
252	http://localhost:3000/uploads/2024/08/10252-01.jpg	imported/10252/0	t	0	203	2025-10-24 00:47:04.585042	2025-10-24 00:47:04.585042
253	http://localhost:3000/uploads/2024/08/10256-01.jpg	imported/10256/0	t	0	204	2025-10-24 00:47:04.599789	2025-10-24 00:47:04.599789
254	http://localhost:3000/uploads/2024/08/10257-01-1.jpg	imported/10257/0	t	0	205	2025-10-24 00:47:04.614855	2025-10-24 00:47:04.614855
255	http://localhost:3000/uploads/2024/08/10258-01-1.jpg	imported/10258/0	t	0	206	2025-10-24 00:47:04.62933	2025-10-24 00:47:04.62933
256	http://localhost:3000/uploads/2024/08/10272-01-1.jpg	imported/10272/0	t	0	207	2025-10-24 00:47:04.643576	2025-10-24 00:47:04.643576
257	http://localhost:3000/uploads/2024/08/10274-01-1.jpg	imported/10274/0	t	0	208	2025-10-24 00:47:04.65866	2025-10-24 00:47:04.65866
258	http://localhost:3000/uploads/2024/08/10286-01.jpg	imported/10286/0	t	0	209	2025-10-24 00:47:04.673699	2025-10-24 00:47:04.673699
259	http://localhost:3000/uploads/2024/08/10288-01-1.jpg	imported/10288/0	t	0	210	2025-10-24 00:47:04.690275	2025-10-24 00:47:04.690275
260	http://localhost:3000/uploads/2024/08/10293-01-1.jpg	imported/10293/0	t	0	211	2025-10-24 00:47:04.706661	2025-10-24 00:47:04.706661
261	http://localhost:3000/uploads/2024/08/10294-01-1.jpg	imported/10294/0	t	0	212	2025-10-24 00:47:04.72191	2025-10-24 00:47:04.72191
262	http://localhost:3000/uploads/2024/08/10295-01-2.jpg	imported/10295/0	t	0	213	2025-10-24 00:47:04.736537	2025-10-24 00:47:04.736537
263	http://localhost:3000/uploads/2024/08/10296-01-2.jpg	imported/10296/0	t	0	214	2025-10-24 00:47:04.751087	2025-10-24 00:47:04.751087
264	http://localhost:3000/uploads/2024/08/10304-01-3.jpg	imported/10304/0	t	0	215	2025-10-24 00:47:04.766644	2025-10-24 00:47:04.766644
265	http://localhost:3000/uploads/2024/08/10305-01-3.jpg	imported/10305/0	t	0	216	2025-10-24 00:47:04.782197	2025-10-24 00:47:04.782197
266	http://localhost:3000/uploads/2024/08/10309-01-3.jpg	imported/10309/0	t	0	217	2025-10-24 00:47:04.798085	2025-10-24 00:47:04.798085
267	http://localhost:3000/uploads/2024/08/10311-01-4.jpg	imported/10311/0	t	0	218	2025-10-24 00:47:04.813622	2025-10-24 00:47:04.813622
268	http://localhost:3000/uploads/2024/08/10316-01-5.jpg	imported/10316/0	t	0	219	2025-10-24 00:47:04.830707	2025-10-24 00:47:04.830707
269	http://localhost:3000/uploads/2024/08/10321-01.jpg	imported/10321/0	t	0	220	2025-10-24 00:47:04.847207	2025-10-24 00:47:04.847207
270	http://localhost:3000/uploads/2024/08/10327-01.jpg	imported/10327/0	t	0	221	2025-10-24 00:47:04.862679	2025-10-24 00:47:04.862679
271	http://localhost:3000/uploads/2024/08/10346-01.jpg	imported/10346/0	t	0	222	2025-10-24 00:47:04.879694	2025-10-24 00:47:04.879694
272	http://localhost:3000/uploads/2024/08/10350-01.jpg	imported/10350/0	t	0	223	2025-10-24 00:47:04.897003	2025-10-24 00:47:04.897003
273	http://localhost:3000/uploads/2024/08/10351-01.jpg	imported/10351/0	t	0	224	2025-10-24 00:47:04.913825	2025-10-24 00:47:04.913825
274	http://localhost:3000/uploads/2024/08/10386-01.jpg	imported/10386/0	t	0	225	2025-10-24 00:47:04.931347	2025-10-24 00:47:04.931347
275	http://localhost:3000/uploads/2024/08/10506-01-1.jpg	imported/10506/0	t	0	226	2025-10-24 00:47:04.967153	2025-10-24 00:47:04.967153
276	http://localhost:3000/uploads/2024/08/10822-01-1.jpg	imported/10822/0	t	0	227	2025-10-24 00:47:04.983121	2025-10-24 00:47:04.983121
277	http://localhost:3000/uploads/2024/08/10823-01-1.jpg	imported/10823/0	t	0	228	2025-10-24 00:47:04.99753	2025-10-24 00:47:04.99753
278	http://localhost:3000/uploads/2024/08/10857-01-1.jpg	imported/10857/0	t	0	229	2025-10-24 00:47:05.012126	2025-10-24 00:47:05.012126
279	http://localhost:3000/uploads/2024/08/10858-01-2.jpg	imported/10858/0	t	0	230	2025-10-24 00:47:05.027039	2025-10-24 00:47:05.027039
280	http://localhost:3000/uploads/2024/08/10863-01-5.jpg	imported/10863/0	t	0	231	2025-10-24 00:47:05.045989	2025-10-24 00:47:05.045989
281	http://localhost:3000/uploads/2024/08/10864-01-1.jpg	imported/10864/0	t	0	232	2025-10-24 00:47:05.064662	2025-10-24 00:47:05.064662
282	http://localhost:3000/uploads/2024/08/10867-01-3.jpg	imported/10867/0	t	0	233	2025-10-24 00:47:05.080525	2025-10-24 00:47:05.080525
283	http://localhost:3000/uploads/2024/08/10893-01-4.jpg	imported/10893/0	t	0	234	2025-10-24 00:47:05.095802	2025-10-24 00:47:05.095802
284	http://localhost:3000/uploads/2024/08/10911-01-3.jpg	imported/10911/0	t	0	235	2025-10-24 00:47:05.113162	2025-10-24 00:47:05.113162
285	http://localhost:3000/uploads/2024/08/10913-01-1.jpg	imported/10913/0	t	0	236	2025-10-24 00:47:05.132357	2025-10-24 00:47:05.132357
286	http://localhost:3000/uploads/2024/08/10922-01-1.jpg	imported/10922/0	t	0	237	2025-10-24 00:47:05.147778	2025-10-24 00:47:05.147778
287	http://localhost:3000/uploads/2024/08/10943-01.jpg	imported/10943/0	t	0	238	2025-10-24 00:47:05.163297	2025-10-24 00:47:05.163297
288	http://localhost:3000/uploads/2024/08/11071-01.jpg	imported/11071/0	t	0	239	2025-10-24 00:47:05.179721	2025-10-24 00:47:05.179721
289	http://localhost:3000/uploads/2024/08/11195-01.jpg	imported/11195/0	t	0	240	2025-10-24 00:47:05.195171	2025-10-24 00:47:05.195171
290	http://localhost:3000/uploads/2024/08/11276-01-1.jpg	imported/11276/0	t	0	241	2025-10-24 00:47:05.210013	2025-10-24 00:47:05.210013
291	http://localhost:3000/uploads/2024/08/11277-01.jpg	imported/11277/0	t	0	242	2025-10-24 00:47:05.224744	2025-10-24 00:47:05.224744
292	http://localhost:3000/uploads/2024/08/11289-01.jpg	imported/11289/0	t	0	243	2025-10-24 00:47:05.239671	2025-10-24 00:47:05.239671
293	http://localhost:3000/uploads/2024/08/11454-01.jpg	imported/11454/0	t	0	244	2025-10-24 00:47:05.254491	2025-10-24 00:47:05.254491
294	http://localhost:3000/uploads/2024/08/11459-01-1.jpg	imported/11459/0	t	0	245	2025-10-24 00:47:05.269016	2025-10-24 00:47:05.269016
295	http://localhost:3000/uploads/2024/08/20298-01-1.jpg	imported/20298/0	t	0	246	2025-10-24 00:47:05.28406	2025-10-24 00:47:05.28406
296	http://localhost:3000/uploads/2024/08/20880-01-1.jpg	imported/20880/0	t	0	247	2025-10-24 00:47:05.299501	2025-10-24 00:47:05.299501
297	http://localhost:3000/uploads/2024/08/21462-01-1.jpg	imported/21462/0	t	0	248	2025-10-24 00:47:05.318655	2025-10-24 00:47:05.318655
298	http://localhost:3000/uploads/2024/08/23035-01-2.jpg	imported/23035/0	t	0	249	2025-10-24 00:47:05.33674	2025-10-24 00:47:05.33674
299	http://localhost:3000/uploads/2024/08/23650-01-2.jpg	imported/23650/0	t	0	250	2025-10-24 00:47:05.355911	2025-10-24 00:47:05.355911
300	http://localhost:3000/uploads/2024/08/23655-01-3.jpg	imported/23655/0	t	0	251	2025-10-24 00:47:05.374687	2025-10-24 00:47:05.374687
301	http://localhost:3000/uploads/2024/08/23657-01-3.jpg	imported/23657/0	t	0	252	2025-10-24 00:47:05.39225	2025-10-24 00:47:05.39225
302	http://localhost:3000/uploads/2024/08/23658-01-3.jpg	imported/23658/0	t	0	253	2025-10-24 00:47:05.411255	2025-10-24 00:47:05.411255
303	http://localhost:3000/uploads/2024/08/23818-01-5.jpg	imported/23818/0	t	0	254	2025-10-24 00:47:05.4293	2025-10-24 00:47:05.4293
304	http://localhost:3000/uploads/2024/08/24314-01.jpg	imported/24314/0	t	0	255	2025-10-24 00:47:05.448119	2025-10-24 00:47:05.448119
305	http://localhost:3000/uploads/2024/08/25487-01-1.jpg	imported/25487/0	t	0	256	2025-10-24 00:47:05.467467	2025-10-24 00:47:05.467467
306	http://localhost:3000/uploads/2024/08/27014-01-1.jpg	imported/27014/0	t	0	257	2025-10-24 00:47:05.484643	2025-10-24 00:47:05.484643
307	http://localhost:3000/uploads/2024/08/27015-01.jpg	imported/27015/0	t	0	258	2025-10-24 00:47:05.518243	2025-10-24 00:47:05.518243
308	http://localhost:3000/uploads/2024/08/27498-01.jpg	imported/27498/0	t	0	259	2025-10-24 00:47:05.533674	2025-10-24 00:47:05.533674
309	http://localhost:3000/uploads/2024/08/27499-01.jpg	imported/27499/0	t	0	260	2025-10-24 00:47:05.549369	2025-10-24 00:47:05.549369
310	http://localhost:3000/uploads/2024/08/27971-01.jpg	imported/27971/0	t	0	261	2025-10-24 00:47:05.565245	2025-10-24 00:47:05.565245
311	http://localhost:3000/uploads/2024/08/28142-01.jpg	imported/28142/0	t	0	262	2025-10-24 00:47:05.579346	2025-10-24 00:47:05.579346
312	http://localhost:3000/uploads/2024/08/28359-01-1.jpg	imported/28359/0	t	0	263	2025-10-24 00:47:05.596133	2025-10-24 00:47:05.596133
313	http://localhost:3000/uploads/2024/08/28451-01.jpg	imported/28451/0	t	0	264	2025-10-24 00:47:05.612238	2025-10-24 00:47:05.612238
314	http://localhost:3000/uploads/2024/08/28784-01.jpg	imported/28784/0	t	0	265	2025-10-24 00:47:05.631704	2025-10-24 00:47:05.631704
315	http://localhost:3000/uploads/2025/06/28784-02.jpg	imported/28784/1	f	1	265	2025-10-24 00:47:05.635579	2025-10-24 00:47:05.635579
316	http://localhost:3000/uploads/2025/06/28784-03.jpg	imported/28784/2	f	2	265	2025-10-24 00:47:05.639293	2025-10-24 00:47:05.639293
317	http://localhost:3000/uploads/2024/08/29371-01.jpg	imported/29371/0	t	0	266	2025-10-24 00:47:05.656458	2025-10-24 00:47:05.656458
318	http://localhost:3000/uploads/2024/08/31353-01.jpg	imported/31353/0	t	0	267	2025-10-24 00:47:05.672445	2025-10-24 00:47:05.672445
319	http://localhost:3000/uploads/2024/08/31648-01.jpg	imported/31648/0	t	0	268	2025-10-24 00:47:05.689802	2025-10-24 00:47:05.689802
320	http://localhost:3000/uploads/2024/08/32849-01.jpg	imported/32849/0	t	0	269	2025-10-24 00:47:05.7056	2025-10-24 00:47:05.7056
321	http://localhost:3000/uploads/2024/08/33520-01.jpg	imported/33520/0	t	0	270	2025-10-24 00:47:05.72173	2025-10-24 00:47:05.72173
322	http://localhost:3000/uploads/2024/08/33521-01.jpg	imported/33521/0	t	0	271	2025-10-24 00:47:05.736339	2025-10-24 00:47:05.736339
323	http://localhost:3000/uploads/2024/08/33524-01.jpg	imported/33524/0	t	0	272	2025-10-24 00:47:05.750788	2025-10-24 00:47:05.750788
324	http://localhost:3000/uploads/2024/08/33526-01.jpg	imported/33526/0	t	0	273	2025-10-24 00:47:05.765321	2025-10-24 00:47:05.765321
325	http://localhost:3000/uploads/2024/08/33643-01.jpg	imported/33643/0	t	0	274	2025-10-24 00:47:05.779987	2025-10-24 00:47:05.779987
326	http://localhost:3000/uploads/2024/08/33874-01.jpg	imported/33874/0	t	0	275	2025-10-24 00:47:05.795778	2025-10-24 00:47:05.795778
327	http://localhost:3000/uploads/2024/08/34110-01.jpg	imported/34110/0	t	0	276	2025-10-24 00:47:05.811305	2025-10-24 00:47:05.811305
328	http://localhost:3000/uploads/2024/08/34446-01.jpg	imported/34446/0	t	0	277	2025-10-24 00:47:05.825553	2025-10-24 00:47:05.825553
329	http://localhost:3000/uploads/2024/08/34840-01.jpg	imported/34840/0	t	0	278	2025-10-24 00:47:05.840323	2025-10-24 00:47:05.840323
330	http://localhost:3000/uploads/2024/08/34844-01.jpg	imported/34844/0	t	0	279	2025-10-24 00:47:05.857548	2025-10-24 00:47:05.857548
331	http://localhost:3000/uploads/2024/08/36521-01.jpg	imported/36521/0	t	0	280	2025-10-24 00:47:05.873777	2025-10-24 00:47:05.873777
332	http://localhost:3000/uploads/2024/08/70027-01.jpg	imported/70027/0	t	0	281	2025-10-24 00:47:05.88962	2025-10-24 00:47:05.88962
333	http://localhost:3000/uploads/2024/08/25207-01.webp	imported/25207/0	t	0	282	2025-10-24 00:47:05.904506	2025-10-24 00:47:05.904506
334	http://localhost:3000/uploads/2024/08/26058-01.webp	imported/26058/0	t	0	283	2025-10-24 00:47:05.919523	2025-10-24 00:47:05.919523
335	http://localhost:3000/uploads/2024/08/28600-01.webp	imported/28600/0	t	0	284	2025-10-24 00:47:05.934062	2025-10-24 00:47:05.934062
336	http://localhost:3000/uploads/2024/08/27969-01.webp	imported/27969/0	t	0	285	2025-10-24 00:47:05.949287	2025-10-24 00:47:05.949287
337	http://localhost:3000/uploads/2024/08/25077-01.webp	imported/25077/0	t	0	286	2025-10-24 00:47:05.964787	2025-10-24 00:47:05.964787
338	http://localhost:3000/uploads/2024/08/28050-01.webp	imported/28050/0	t	0	287	2025-10-24 00:47:05.983823	2025-10-24 00:47:05.983823
339	http://localhost:3000/uploads/2024/08/34995-01.webp	imported/34995/0	t	0	288	2025-10-24 00:47:06.001094	2025-10-24 00:47:06.001094
340	http://localhost:3000/uploads/2025/06/34995-02.jpg	imported/34995/1	f	1	288	2025-10-24 00:47:06.005142	2025-10-24 00:47:06.005142
341	http://localhost:3000/uploads/2024/08/31961-01.webp	imported/31961/0	t	0	289	2025-10-24 00:47:06.043175	2025-10-24 00:47:06.043175
342	http://localhost:3000/uploads/2025/06/31961-02.jpg	imported/31961/1	f	1	289	2025-10-24 00:47:06.047776	2025-10-24 00:47:06.047776
343	http://localhost:3000/uploads/2025/06/31961-03.jpg	imported/31961/2	f	2	289	2025-10-24 00:47:06.052582	2025-10-24 00:47:06.052582
344	http://localhost:3000/uploads/2024/08/24957-01.png	imported/24957/0	t	0	290	2025-10-24 00:47:06.06861	2025-10-24 00:47:06.06861
345	http://localhost:3000/uploads/2024/08/27088-01.jpg	imported/27088/0	t	0	291	2025-10-24 00:47:06.085171	2025-10-24 00:47:06.085171
346	http://localhost:3000/uploads/2024/08/20574-01.jpg	imported/20574/0	t	0	292	2025-10-24 00:47:06.100505	2025-10-24 00:47:06.100505
347	http://localhost:3000/uploads/2024/08/20573-01.jpg	imported/20573/0	t	0	293	2025-10-24 00:47:06.116364	2025-10-24 00:47:06.116364
348	http://localhost:3000/uploads/2024/08/20581-01.jpg	imported/20581/0	t	0	294	2025-10-24 00:47:06.133362	2025-10-24 00:47:06.133362
349	http://localhost:3000/uploads/2024/08/20582-01.jpg	imported/20582/0	t	0	295	2025-10-24 00:47:06.151059	2025-10-24 00:47:06.151059
350	http://localhost:3000/uploads/2024/08/20583-01.jpg	imported/20583/0	t	0	296	2025-10-24 00:47:06.170331	2025-10-24 00:47:06.170331
351	http://localhost:3000/uploads/2024/08/20584-010.jpg	imported/20584/0	t	0	297	2025-10-24 00:47:06.190243	2025-10-24 00:47:06.190243
352	http://localhost:3000/uploads/2024/08/20585-01.jpg	imported/20585/0	t	0	298	2025-10-24 00:47:06.210056	2025-10-24 00:47:06.210056
353	http://localhost:3000/uploads/2024/08/20586-01.jpg	imported/20586/0	t	0	299	2025-10-24 00:47:06.227864	2025-10-24 00:47:06.227864
354	http://localhost:3000/uploads/2024/08/20587-01.jpg	imported/20587/0	t	0	300	2025-10-24 00:47:06.244878	2025-10-24 00:47:06.244878
355	http://localhost:3000/uploads/2024/08/20590-01.jpg	imported/20590/0	t	0	301	2025-10-24 00:47:06.260848	2025-10-24 00:47:06.260848
356	http://localhost:3000/uploads/2024/08/20591-01.jpg	imported/20591/0	t	0	302	2025-10-24 00:47:06.277066	2025-10-24 00:47:06.277066
357	http://localhost:3000/uploads/2024/08/20593-01.jpg	imported/20593/0	t	0	303	2025-10-24 00:47:06.292712	2025-10-24 00:47:06.292712
358	http://localhost:3000/uploads/2024/08/20594-01.jpg	imported/20594/0	t	0	304	2025-10-24 00:47:06.306909	2025-10-24 00:47:06.306909
359	http://localhost:3000/uploads/2024/08/20596-01.jpg	imported/20596/0	t	0	305	2025-10-24 00:47:06.320844	2025-10-24 00:47:06.320844
360	http://localhost:3000/uploads/2024/08/20598-01.jpg	imported/20598/0	t	0	306	2025-10-24 00:47:06.335552	2025-10-24 00:47:06.335552
361	http://localhost:3000/uploads/2024/08/20599-01.jpg	imported/20599/0	t	0	307	2025-10-24 00:47:06.349181	2025-10-24 00:47:06.349181
362	http://localhost:3000/uploads/2024/08/20602-01.jpg	imported/20602/0	t	0	308	2025-10-24 00:47:06.363392	2025-10-24 00:47:06.363392
363	http://localhost:3000/uploads/2024/08/20604-01.jpg	imported/20604/0	t	0	309	2025-10-24 00:47:06.378166	2025-10-24 00:47:06.378166
364	http://localhost:3000/uploads/2024/08/20605-01.jpg	imported/20605/0	t	0	310	2025-10-24 00:47:06.396096	2025-10-24 00:47:06.396096
365	http://localhost:3000/uploads/2024/10/20606-01.jpg	imported/20606/0	t	0	311	2025-10-24 00:47:06.412257	2025-10-24 00:47:06.412257
366	http://localhost:3000/uploads/2024/08/24800-01.jpg	imported/24800/0	t	0	312	2025-10-24 00:47:06.427572	2025-10-24 00:47:06.427572
367	http://localhost:3000/uploads/2024/08/24805-01.jpg	imported/24805/0	t	0	313	2025-10-24 00:47:06.442746	2025-10-24 00:47:06.442746
368	http://localhost:3000/uploads/2024/08/28561-01.jpg	imported/28561/0	t	0	314	2025-10-24 00:47:06.458939	2025-10-24 00:47:06.458939
369	http://localhost:3000/uploads/2024/08/30550-01.jpg	imported/30550/0	t	0	315	2025-10-24 00:47:06.474955	2025-10-24 00:47:06.474955
370	http://localhost:3000/uploads/2024/08/30911-01.jpg	imported/30911/0	t	0	316	2025-10-24 00:47:06.495181	2025-10-24 00:47:06.495181
371	http://localhost:3000/uploads/2024/08/35102-01.jpg	imported/35102/0	t	0	317	2025-10-24 00:47:06.515853	2025-10-24 00:47:06.515853
372	http://localhost:3000/uploads/2024/08/20614-01.jpg	imported/20614/0	t	0	318	2025-10-24 00:47:06.531768	2025-10-24 00:47:06.531768
373	http://localhost:3000/uploads/2024/08/20617-01.jpg	imported/20617/0	t	0	319	2025-10-24 00:47:06.5461	2025-10-24 00:47:06.5461
374	http://localhost:3000/uploads/2024/08/20625-01.jpg	imported/20625/0	t	0	320	2025-10-24 00:47:06.579481	2025-10-24 00:47:06.579481
375	http://localhost:3000/uploads/2024/08/20626-01.jpg	imported/20626/0	t	0	321	2025-10-24 00:47:06.594865	2025-10-24 00:47:06.594865
376	http://localhost:3000/uploads/2024/08/20631-01.jpg	imported/20631/0	t	0	322	2025-10-24 00:47:06.60995	2025-10-24 00:47:06.60995
377	http://localhost:3000/uploads/2024/08/20634-01.jpg	imported/20634/0	t	0	323	2025-10-24 00:47:06.628977	2025-10-24 00:47:06.628977
378	http://localhost:3000/uploads/2024/08/20643-01.jpg	imported/20643/0	t	0	324	2025-10-24 00:47:06.647052	2025-10-24 00:47:06.647052
379	http://localhost:3000/uploads/2024/08/20644-01.jpg	imported/20644/0	t	0	325	2025-10-24 00:47:06.66445	2025-10-24 00:47:06.66445
380	http://localhost:3000/uploads/2024/10/20645-01.jpg	imported/20645/0	t	0	326	2025-10-24 00:47:06.684115	2025-10-24 00:47:06.684115
381	http://localhost:3000/uploads/2024/10/20254-01.jpg	imported/20254/0	t	0	327	2025-10-24 00:47:06.701622	2025-10-24 00:47:06.701622
382	http://localhost:3000/uploads/2024/10/26781-01.jpg	imported/26781/0	t	0	328	2025-10-24 00:47:06.719425	2025-10-24 00:47:06.719425
383	http://localhost:3000/uploads/2024/08/20702-01.jpg	imported/20702/0	t	0	329	2025-10-24 00:47:06.736418	2025-10-24 00:47:06.736418
384	http://localhost:3000/uploads/2024/08/20703-01.jpg	imported/20703/0	t	0	330	2025-10-24 00:47:06.752957	2025-10-24 00:47:06.752957
385	http://localhost:3000/uploads/2024/08/26782-01.jpg	imported/26782/0	t	0	331	2025-10-24 00:47:06.771122	2025-10-24 00:47:06.771122
386	http://localhost:3000/uploads/2024/08/26678-01.jpg	imported/26678/0	t	0	332	2025-10-24 00:47:06.788421	2025-10-24 00:47:06.788421
387	http://localhost:3000/uploads/2024/08/29032-01.jpg	imported/29032/0	t	0	333	2025-10-24 00:47:06.804766	2025-10-24 00:47:06.804766
388	http://localhost:3000/uploads/2024/08/20651-01.jpg	imported/20651/0	t	0	334	2025-10-24 00:47:06.818699	2025-10-24 00:47:06.818699
389	http://localhost:3000/uploads/2024/08/29390-01.jpg	imported/29390/0	t	0	335	2025-10-24 00:47:06.832946	2025-10-24 00:47:06.832946
390	http://localhost:3000/uploads/2024/08/20654-01.jpg	imported/20654/0	t	0	336	2025-10-24 00:47:06.849229	2025-10-24 00:47:06.849229
391	http://localhost:3000/uploads/2024/08/29393-01.jpg	imported/29393/0	t	0	337	2025-10-24 00:47:06.866711	2025-10-24 00:47:06.866711
392	http://localhost:3000/uploads/2024/08/30216-01.jpg	imported/30216/0	t	0	338	2025-10-24 00:47:06.883406	2025-10-24 00:47:06.883406
393	http://localhost:3000/uploads/2024/08/27192-01.jpg	imported/27192/0	t	0	339	2025-10-24 00:47:06.899111	2025-10-24 00:47:06.899111
394	http://localhost:3000/uploads/2024/08/30563-01.jpg	imported/30563/0	t	0	340	2025-10-24 00:47:06.91548	2025-10-24 00:47:06.91548
395	http://localhost:3000/uploads/2024/10/27193-01.jpg	imported/27193/0	t	0	341	2025-10-24 00:47:06.930433	2025-10-24 00:47:06.930433
396	http://localhost:3000/uploads/2024/08/30927-01.jpg	imported/30927/0	t	0	342	2025-10-24 00:47:06.946027	2025-10-24 00:47:06.946027
397	http://localhost:3000/uploads/2024/10/35030-01.jpg	imported/35030/0	t	0	343	2025-10-24 00:47:06.960969	2025-10-24 00:47:06.960969
398	http://localhost:3000/uploads/2024/08/28568-01.jpg	imported/28568/0	t	0	344	2025-10-24 00:47:06.976186	2025-10-24 00:47:06.976186
399	http://localhost:3000/uploads/2024/08/20691-01.jpg	imported/20691/0	t	0	345	2025-10-24 00:47:06.990271	2025-10-24 00:47:06.990271
400	http://localhost:3000/uploads/2024/08/20692-01.jpg	imported/20692/0	t	0	346	2025-10-24 00:47:07.004452	2025-10-24 00:47:07.004452
401	http://localhost:3000/uploads/2024/08/20693-01.jpg	imported/20693/0	t	0	347	2025-10-24 00:47:07.018698	2025-10-24 00:47:07.018698
402	http://localhost:3000/uploads/2024/08/35002-01.jpg	imported/35002/0	t	0	348	2025-10-24 00:47:07.032535	2025-10-24 00:47:07.032535
403	http://localhost:3000/uploads/2024/08/20697-01.jpg	imported/20697/0	t	0	349	2025-10-24 00:47:07.047571	2025-10-24 00:47:07.047571
404	http://localhost:3000/uploads/2024/10/20698-01.jpg	imported/20698/0	t	0	350	2025-10-24 00:47:07.062364	2025-10-24 00:47:07.062364
405	http://localhost:3000/uploads/2024/10/20699-01.jpg	imported/20699/0	t	0	351	2025-10-24 00:47:07.098183	2025-10-24 00:47:07.098183
406	http://localhost:3000/uploads/2024/10/35004-01.jpg	imported/35004/0	t	0	352	2025-10-24 00:47:07.113307	2025-10-24 00:47:07.113307
407	http://localhost:3000/uploads/2024/10/20700-01.jpg	imported/20700/0	t	0	353	2025-10-24 00:47:07.128188	2025-10-24 00:47:07.128188
408	http://localhost:3000/uploads/2024/08/20701-01.jpg	imported/20701/0	t	0	354	2025-10-24 00:47:07.145261	2025-10-24 00:47:07.145261
409	http://localhost:3000/uploads/2024/08/35040-01.jpg	imported/35040/0	t	0	355	2025-10-24 00:47:07.161876	2025-10-24 00:47:07.161876
410	http://localhost:3000/uploads/2024/08/35043-01.jpg	imported/35043/0	t	0	356	2025-10-24 00:47:07.176872	2025-10-24 00:47:07.176872
411	http://localhost:3000/uploads/2024/08/35048-01.jpg	imported/35048/0	t	0	357	2025-10-24 00:47:07.193185	2025-10-24 00:47:07.193185
412	http://localhost:3000/uploads/2024/08/21030-01.jpg	imported/21030/0	t	0	358	2025-10-24 00:47:07.208387	2025-10-24 00:47:07.208387
413	http://localhost:3000/uploads/2024/08/20887-01.jpg	imported/20887/0	t	0	359	2025-10-24 00:47:07.222518	2025-10-24 00:47:07.222518
414	http://localhost:3000/uploads/2024/08/24809-01.jpg	imported/24809/0	t	0	360	2025-10-24 00:47:07.236552	2025-10-24 00:47:07.236552
415	http://localhost:3000/uploads/2024/08/26017-01.jpg	imported/26017/0	t	0	361	2025-10-24 00:47:07.250521	2025-10-24 00:47:07.250521
416	http://localhost:3000/uploads/2024/08/26710-01.jpg	imported/26710/0	t	0	362	2025-10-24 00:47:07.264663	2025-10-24 00:47:07.264663
417	http://localhost:3000/uploads/2024/08/20711-01.jpg	imported/20711/0	t	0	363	2025-10-24 00:47:07.279247	2025-10-24 00:47:07.279247
418	http://localhost:3000/uploads/2024/08/20709-01.jpg	imported/20709/0	t	0	364	2025-10-24 00:47:07.298114	2025-10-24 00:47:07.298114
419	http://localhost:3000/uploads/2024/08/20657-01.jpg	imported/20657/0	t	0	365	2025-10-24 00:47:07.31338	2025-10-24 00:47:07.31338
420	http://localhost:3000/uploads/2024/08/28569-01.jpg	imported/28569/0	t	0	366	2025-10-24 00:47:07.329251	2025-10-24 00:47:07.329251
421	http://localhost:3000/uploads/2024/10/24820-01.jpg	imported/24820/0	t	0	367	2025-10-24 00:47:07.344772	2025-10-24 00:47:07.344772
422	http://localhost:3000/uploads/2024/10/24823-01.jpg	imported/24823/0	t	0	368	2025-10-24 00:47:07.358765	2025-10-24 00:47:07.358765
423	http://localhost:3000/uploads/2024/08/25263-01.jpg	imported/25263/0	t	0	369	2025-10-24 00:47:07.374318	2025-10-24 00:47:07.374318
424	http://localhost:3000/uploads/2024/08/25264-01.jpg	imported/25264/0	t	0	370	2025-10-24 00:47:07.389178	2025-10-24 00:47:07.389178
425	http://localhost:3000/uploads/2024/10/26008-01.jpg	imported/26008/0	t	0	371	2025-10-24 00:47:07.402621	2025-10-24 00:47:07.402621
426	http://localhost:3000/uploads/2024/08/26009-01.jpg	imported/26009/0	t	0	372	2025-10-24 00:47:07.417106	2025-10-24 00:47:07.417106
427	http://localhost:3000/uploads/2024/08/26010-01.jpg	imported/26010/0	t	0	373	2025-10-24 00:47:07.432183	2025-10-24 00:47:07.432183
428	http://localhost:3000/uploads/2024/08/26018-01.jpg	imported/26018/0	t	0	374	2025-10-24 00:47:07.446591	2025-10-24 00:47:07.446591
429	http://localhost:3000/uploads/2024/08/26098-01.jpg	imported/26098/0	t	0	375	2025-10-24 00:47:07.466325	2025-10-24 00:47:07.466325
430	http://localhost:3000/uploads/2024/08/26708-01.jpg	imported/26708/0	t	0	376	2025-10-24 00:47:07.491277	2025-10-24 00:47:07.491277
431	http://localhost:3000/uploads/2024/08/26709-01.jpg	imported/26709/0	t	0	377	2025-10-24 00:47:07.506702	2025-10-24 00:47:07.506702
432	http://localhost:3000/uploads/2024/08/26711-01.jpg	imported/26711/0	t	0	378	2025-10-24 00:47:07.52066	2025-10-24 00:47:07.52066
433	http://localhost:3000/uploads/2024/08/26712-01.jpg	imported/26712/0	t	0	379	2025-10-24 00:47:07.534442	2025-10-24 00:47:07.534442
434	http://localhost:3000/uploads/2024/08/26713-01.jpg	imported/26713/0	t	0	380	2025-10-24 00:47:07.548718	2025-10-24 00:47:07.548718
435	http://localhost:3000/uploads/2024/08/20710-01.jpg	imported/20710/0	t	0	381	2025-10-24 00:47:07.56456	2025-10-24 00:47:07.56456
436	http://localhost:3000/uploads/2024/08/20712-01.jpg	imported/20712/0	t	0	382	2025-10-24 00:47:07.579298	2025-10-24 00:47:07.579298
437	http://localhost:3000/uploads/2024/08/28567-01.jpg	imported/28567/0	t	0	383	2025-10-24 00:47:07.612886	2025-10-24 00:47:07.612886
438	http://localhost:3000/uploads/2024/08/26002-01-2.jpg	imported/26002/0	t	0	384	2025-10-24 00:47:07.629199	2025-10-24 00:47:07.629199
439	http://localhost:3000/uploads/2024/08/20668-01-2.jpg	imported/20668/0	t	0	385	2025-10-24 00:47:07.645743	2025-10-24 00:47:07.645743
440	http://localhost:3000/uploads/2024/08/20669-01-1.jpg	imported/20669/0	t	0	386	2025-10-24 00:47:07.662695	2025-10-24 00:47:07.662695
441	http://localhost:3000/uploads/2024/08/20667-01-2.jpg	imported/20667/0	t	0	387	2025-10-24 00:47:07.68115	2025-10-24 00:47:07.68115
442	http://localhost:3000/uploads/2024/08/26003-01-1.jpg	imported/26003/0	t	0	388	2025-10-24 00:47:07.700326	2025-10-24 00:47:07.700326
443	http://localhost:3000/uploads/2024/09/26004-01.jpg	imported/26004/0	t	0	389	2025-10-24 00:47:07.716071	2025-10-24 00:47:07.716071
444	http://localhost:3000/uploads/2024/08/25111-01.jpg	imported/25111/0	t	0	390	2025-10-24 00:47:07.731296	2025-10-24 00:47:07.731296
445	http://localhost:3000/uploads/2024/08/20665-01.jpg	imported/20665/0	t	0	391	2025-10-24 00:47:07.746312	2025-10-24 00:47:07.746312
446	http://localhost:3000/uploads/2024/08/20684-01.jpg	imported/20684/0	t	0	392	2025-10-24 00:47:07.762654	2025-10-24 00:47:07.762654
447	http://localhost:3000/uploads/2024/08/20685-01.jpg	imported/20685/0	t	0	393	2025-10-24 00:47:07.778983	2025-10-24 00:47:07.778983
448	http://localhost:3000/uploads/2024/08/20733-01.jpg	imported/20733/0	t	0	394	2025-10-24 00:47:07.794274	2025-10-24 00:47:07.794274
449	http://localhost:3000/uploads/2024/08/25685-01.jpg	imported/25685/0	t	0	395	2025-10-24 00:47:07.81218	2025-10-24 00:47:07.81218
450	http://localhost:3000/uploads/2024/08/20681-01.jpg	imported/20681/0	t	0	396	2025-10-24 00:47:07.827951	2025-10-24 00:47:07.827951
451	http://localhost:3000/uploads/2024/08/20682-01.jpg	imported/20682/0	t	0	397	2025-10-24 00:47:07.841981	2025-10-24 00:47:07.841981
452	http://localhost:3000/uploads/2024/08/25228-01.jpg	imported/25228/0	t	0	398	2025-10-24 00:47:07.857112	2025-10-24 00:47:07.857112
453	http://localhost:3000/uploads/2024/09/20670-01.jpg	imported/20670/0	t	0	399	2025-10-24 00:47:07.870455	2025-10-24 00:47:07.870455
454	http://localhost:3000/uploads/2024/08/20671-01.jpg	imported/20671/0	t	0	400	2025-10-24 00:47:07.884652	2025-10-24 00:47:07.884652
455	http://localhost:3000/uploads/2024/08/20672-01.jpg	imported/20672/0	t	0	401	2025-10-24 00:47:07.898684	2025-10-24 00:47:07.898684
456	http://localhost:3000/uploads/2024/08/20673-01.jpg	imported/20673/0	t	0	402	2025-10-24 00:47:07.911646	2025-10-24 00:47:07.911646
457	http://localhost:3000/uploads/2024/08/20676-01.jpg	imported/20676/0	t	0	403	2025-10-24 00:47:07.924493	2025-10-24 00:47:07.924493
458	http://localhost:3000/uploads/2024/09/20674-01.jpg	imported/20674/0	t	0	404	2025-10-24 00:47:07.936994	2025-10-24 00:47:07.936994
459	http://localhost:3000/uploads/2024/09/20675-01.jpg	imported/20675/0	t	0	405	2025-10-24 00:47:07.94977	2025-10-24 00:47:07.94977
460	http://localhost:3000/uploads/2024/09/20677-01.jpg	imported/20677/0	t	0	406	2025-10-24 00:47:07.962966	2025-10-24 00:47:07.962966
461	http://localhost:3000/uploads/2024/08/20725-01.jpg	imported/20725/0	t	0	407	2025-10-24 00:47:07.976033	2025-10-24 00:47:07.976033
462	http://localhost:3000/uploads/2024/08/20686-01.jpg	imported/20686/0	t	0	408	2025-10-24 00:47:07.990048	2025-10-24 00:47:07.990048
463	http://localhost:3000/uploads/2024/09/20901-01.png	imported/20901/0	t	0	409	2025-10-24 00:47:08.003626	2025-10-24 00:47:08.003626
464	http://localhost:3000/uploads/2024/09/21513-01.png	imported/21513/0	t	0	410	2025-10-24 00:47:08.018185	2025-10-24 00:47:08.018185
465	http://localhost:3000/uploads/2024/09/22103-01.png	imported/22103/0	t	0	411	2025-10-24 00:47:08.032744	2025-10-24 00:47:08.032744
466	http://localhost:3000/uploads/2024/09/22181-01.png	imported/22181/0	t	0	412	2025-10-24 00:47:08.046798	2025-10-24 00:47:08.046798
467	http://localhost:3000/uploads/2024/09/22239-01.png	imported/22239/0	t	0	413	2025-10-24 00:47:08.062501	2025-10-24 00:47:08.062501
468	http://localhost:3000/uploads/2024/09/22357-01.png	imported/22357/0	t	0	414	2025-10-24 00:47:08.077629	2025-10-24 00:47:08.077629
469	http://localhost:3000/uploads/2024/09/22382-01.png	imported/22382/0	t	0	415	2025-10-24 00:47:08.111432	2025-10-24 00:47:08.111432
470	http://localhost:3000/uploads/2024/09/22803-01.png	imported/22803/0	t	0	416	2025-10-24 00:47:08.131692	2025-10-24 00:47:08.131692
471	http://localhost:3000/uploads/2024/09/23093-01.png	imported/23093/0	t	0	417	2025-10-24 00:47:08.146473	2025-10-24 00:47:08.146473
472	http://localhost:3000/uploads/2024/09/23285-01.png	imported/23285/0	t	0	418	2025-10-24 00:47:08.162071	2025-10-24 00:47:08.162071
473	http://localhost:3000/uploads/2024/09/24699-01.png	imported/24699/0	t	0	421	2025-10-24 00:47:08.187618	2025-10-24 00:47:08.187618
474	http://localhost:3000/uploads/2024/09/24937-01.png	imported/24937/0	t	0	422	2025-10-24 00:47:08.20053	2025-10-24 00:47:08.20053
475	http://localhost:3000/uploads/2024/09/25012-01.png	imported/25012/0	t	0	423	2025-10-24 00:47:08.212851	2025-10-24 00:47:08.212851
476	http://localhost:3000/uploads/2024/09/25152-01.png	imported/25152/0	t	0	424	2025-10-24 00:47:08.227147	2025-10-24 00:47:08.227147
477	http://localhost:3000/uploads/2024/09/25440-01.png	imported/25440/0	t	0	425	2025-10-24 00:47:08.240193	2025-10-24 00:47:08.240193
478	http://localhost:3000/uploads/2024/09/25735-01.png	imported/25735/0	t	0	426	2025-10-24 00:47:08.255082	2025-10-24 00:47:08.255082
479	http://localhost:3000/uploads/2024/10/26667-01.png	imported/26667/0	t	0	427	2025-10-24 00:47:08.26877	2025-10-24 00:47:08.26877
480	http://localhost:3000/uploads/2024/09/26676-01.png	imported/26676/0	t	0	428	2025-10-24 00:47:08.282342	2025-10-24 00:47:08.282342
481	http://localhost:3000/uploads/2024/09/28319-01.png	imported/28319/0	t	0	429	2025-10-24 00:47:08.29711	2025-10-24 00:47:08.29711
482	http://localhost:3000/uploads/2024/09/28333-01.png	imported/28333/0	t	0	430	2025-10-24 00:47:08.309686	2025-10-24 00:47:08.309686
483	http://localhost:3000/uploads/2024/09/28503-01.png	imported/28503/0	t	0	431	2025-10-24 00:47:08.322302	2025-10-24 00:47:08.322302
484	http://localhost:3000/uploads/2024/09/26236-01.png	imported/26236/0	t	0	432	2025-10-24 00:47:08.336689	2025-10-24 00:47:08.336689
485	http://localhost:3000/uploads/2024/09/28623-01.png	imported/28623/0	t	0	433	2025-10-24 00:47:08.350047	2025-10-24 00:47:08.350047
486	http://localhost:3000/uploads/2024/09/26380-01.png	imported/26380/0	t	0	434	2025-10-24 00:47:08.364226	2025-10-24 00:47:08.364226
487	http://localhost:3000/uploads/2024/09/28757-01.png	imported/28757/0	t	0	435	2025-10-24 00:47:08.377376	2025-10-24 00:47:08.377376
488	http://localhost:3000/uploads/2024/09/26504-01.png	imported/26504/0	t	0	436	2025-10-24 00:47:08.391008	2025-10-24 00:47:08.391008
489	http://localhost:3000/uploads/2024/09/29017-01.png	imported/29017/0	t	0	437	2025-10-24 00:47:08.404382	2025-10-24 00:47:08.404382
490	http://localhost:3000/uploads/2024/09/26561-01.png	imported/26561/0	t	0	438	2025-10-24 00:47:08.419554	2025-10-24 00:47:08.419554
491	http://localhost:3000/uploads/2024/09/29173-01.png	imported/29173/0	t	0	439	2025-10-24 00:47:08.433869	2025-10-24 00:47:08.433869
492	http://localhost:3000/uploads/2024/09/29374-01.png	imported/29374/0	t	0	440	2025-10-24 00:47:08.447264	2025-10-24 00:47:08.447264
493	http://localhost:3000/uploads/2024/09/29381-01.png	imported/29381/0	t	0	441	2025-10-24 00:47:08.461286	2025-10-24 00:47:08.461286
494	http://localhost:3000/uploads/2024/09/29665-01.png	imported/29665/0	t	0	442	2025-10-24 00:47:08.474837	2025-10-24 00:47:08.474837
495	http://localhost:3000/uploads/2024/09/30131-01.png	imported/30131/0	t	0	443	2025-10-24 00:47:08.490556	2025-10-24 00:47:08.490556
496	http://localhost:3000/uploads/2024/09/30265-01.png	imported/30265/0	t	0	444	2025-10-24 00:47:08.507227	2025-10-24 00:47:08.507227
497	http://localhost:3000/uploads/2024/09/30295-01.png	imported/30295/0	t	0	445	2025-10-24 00:47:08.533412	2025-10-24 00:47:08.533412
498	http://localhost:3000/uploads/2024/09/31510-01.png	imported/31510/0	t	0	446	2025-10-24 00:47:08.547302	2025-10-24 00:47:08.547302
499	http://localhost:3000/uploads/2024/09/31770-01.png	imported/31770/0	t	0	447	2025-10-24 00:47:08.564688	2025-10-24 00:47:08.564688
500	http://localhost:3000/uploads/2024/09/31932-01.png	imported/31932/0	t	0	448	2025-10-24 00:47:08.580327	2025-10-24 00:47:08.580327
501	http://localhost:3000/uploads/2024/09/32635-01.png	imported/32635/0	t	0	449	2025-10-24 00:47:08.596754	2025-10-24 00:47:08.596754
502	http://localhost:3000/uploads/2024/09/32668-01.png	imported/32668/0	t	0	450	2025-10-24 00:47:08.61265	2025-10-24 00:47:08.61265
503	http://localhost:3000/uploads/2024/09/32780-01.png	imported/32780/0	t	0	451	2025-10-24 00:47:08.626754	2025-10-24 00:47:08.626754
504	http://localhost:3000/uploads/2024/09/32892-01.png	imported/32892/0	t	0	452	2025-10-24 00:47:08.64067	2025-10-24 00:47:08.64067
505	http://localhost:3000/uploads/2024/10/32904-01.png	imported/32904/0	t	0	453	2025-10-24 00:47:08.656273	2025-10-24 00:47:08.656273
506	http://localhost:3000/uploads/2024/10/32908-01.png	imported/32908/0	t	0	454	2025-10-24 00:47:08.672882	2025-10-24 00:47:08.672882
507	http://localhost:3000/uploads/2024/10/32921-01.png	imported/32921/0	t	0	455	2025-10-24 00:47:08.687203	2025-10-24 00:47:08.687203
508	http://localhost:3000/uploads/2024/09/32978-01.png	imported/32978/0	t	0	456	2025-10-24 00:47:08.70269	2025-10-24 00:47:08.70269
509	http://localhost:3000/uploads/2024/09/26715-01.png	imported/26715/0	t	0	457	2025-10-24 00:47:08.720237	2025-10-24 00:47:08.720237
510	http://localhost:3000/uploads/2024/09/26726-01.png	imported/26726/0	t	0	458	2025-10-24 00:47:08.743521	2025-10-24 00:47:08.743521
511	http://localhost:3000/uploads/2024/09/26822-01.png	imported/26822/0	t	0	459	2025-10-24 00:47:08.756711	2025-10-24 00:47:08.756711
512	http://localhost:3000/uploads/2024/09/26910-01.png	imported/26910/0	t	0	460	2025-10-24 00:47:08.771295	2025-10-24 00:47:08.771295
513	http://localhost:3000/uploads/2024/09/27761-01.png	imported/27761/0	t	0	461	2025-10-24 00:47:08.785769	2025-10-24 00:47:08.785769
514	http://localhost:3000/uploads/2024/09/28161-01.png	imported/28161/0	t	0	462	2025-10-24 00:47:08.79937	2025-10-24 00:47:08.79937
515	http://localhost:3000/uploads/2024/09/28282-01.png	imported/28282/0	t	0	463	2025-10-24 00:47:08.812074	2025-10-24 00:47:08.812074
516	http://localhost:3000/uploads/2024/09/28303-01.png	imported/28303/0	t	0	464	2025-10-24 00:47:08.827004	2025-10-24 00:47:08.827004
517	http://localhost:3000/uploads/2024/09/33020-01.png	imported/33020/0	t	0	465	2025-10-24 00:47:08.839746	2025-10-24 00:47:08.839746
518	http://localhost:3000/uploads/2024/09/33273-01.png	imported/33273/0	t	0	466	2025-10-24 00:47:08.853632	2025-10-24 00:47:08.853632
519	http://localhost:3000/uploads/2024/09/33339-01.png	imported/33339/0	t	0	467	2025-10-24 00:47:08.868217	2025-10-24 00:47:08.868217
520	http://localhost:3000/uploads/2024/09/33352-01.png	imported/33352/0	t	0	468	2025-10-24 00:47:08.884122	2025-10-24 00:47:08.884122
521	http://localhost:3000/uploads/2024/09/33414-01.png	imported/33414/0	t	0	469	2025-10-24 00:47:08.897872	2025-10-24 00:47:08.897872
522	http://localhost:3000/uploads/2024/09/33458-01.png	imported/33458/0	t	0	470	2025-10-24 00:47:08.911669	2025-10-24 00:47:08.911669
523	http://localhost:3000/uploads/2024/09/34443-01.png	imported/34443/0	t	0	471	2025-10-24 00:47:08.926175	2025-10-24 00:47:08.926175
524	http://localhost:3000/uploads/2024/10/26327-01.png	imported/26327/0	t	0	472	2025-10-24 00:47:08.942099	2025-10-24 00:47:08.942099
525	http://localhost:3000/uploads/2024/09/28608-01.png	imported/28608/0	t	0	473	2025-10-24 00:47:08.957859	2025-10-24 00:47:08.957859
526	http://localhost:3000/uploads/2024/09/29623-01.png	imported/29623/0	t	0	474	2025-10-24 00:47:08.972135	2025-10-24 00:47:08.972135
527	http://localhost:3000/uploads/2024/09/33282-01.png	imported/33282/0	t	0	475	2025-10-24 00:47:08.986941	2025-10-24 00:47:08.986941
528	http://localhost:3000/uploads/2024/09/33354-01.png	imported/33354/0	t	0	476	2025-10-24 00:47:09.001462	2025-10-24 00:47:09.001462
529	http://localhost:3000/uploads/2024/09/20119-01.png	imported/20119/0	t	0	477	2025-10-24 00:47:09.016393	2025-10-24 00:47:09.016393
530	http://localhost:3000/uploads/2024/09/20172-01.png	imported/20172/0	t	0	478	2025-10-24 00:47:09.030574	2025-10-24 00:47:09.030574
531	http://localhost:3000/uploads/2024/09/20387-01.png	imported/20387/0	t	0	479	2025-10-24 00:47:09.045913	2025-10-24 00:47:09.045913
532	http://localhost:3000/uploads/2024/09/20440-01.png	imported/20440/0	t	0	480	2025-10-24 00:47:09.060875	2025-10-24 00:47:09.060875
533	http://localhost:3000/uploads/2024/09/20456-01.png	imported/20456/0	t	0	481	2025-10-24 00:47:09.093199	2025-10-24 00:47:09.093199
534	http://localhost:3000/uploads/2024/09/21150-01.png	imported/21150/0	t	0	482	2025-10-24 00:47:09.108167	2025-10-24 00:47:09.108167
535	http://localhost:3000/uploads/2024/09/21151-01.png	imported/21151/0	t	0	483	2025-10-24 00:47:09.124253	2025-10-24 00:47:09.124253
536	http://localhost:3000/uploads/2024/09/21152-01.png	imported/21152/0	t	0	484	2025-10-24 00:47:09.139132	2025-10-24 00:47:09.139132
537	http://localhost:3000/uploads/2024/09/21153-01.png	imported/21153/0	t	0	485	2025-10-24 00:47:09.15463	2025-10-24 00:47:09.15463
538	http://localhost:3000/uploads/2024/09/21161-01.png	imported/21161/0	t	0	486	2025-10-24 00:47:09.169304	2025-10-24 00:47:09.169304
539	http://localhost:3000/uploads/2024/09/21162-01.png	imported/21162/0	t	0	487	2025-10-24 00:47:09.183226	2025-10-24 00:47:09.183226
540	http://localhost:3000/uploads/2024/09/21163-01.png	imported/21163/0	t	0	488	2025-10-24 00:47:09.196745	2025-10-24 00:47:09.196745
541	http://localhost:3000/uploads/2024/09/21164-01-1.png	imported/21164/0	t	0	489	2025-10-24 00:47:09.211162	2025-10-24 00:47:09.211162
542	http://localhost:3000/uploads/2024/09/21165-01-1.png	imported/21165/0	t	0	490	2025-10-24 00:47:09.226135	2025-10-24 00:47:09.226135
543	http://localhost:3000/uploads/2024/09/21167-01-1.png	imported/21167/0	t	0	491	2025-10-24 00:47:09.239889	2025-10-24 00:47:09.239889
544	http://localhost:3000/uploads/2024/09/21170-01-1.png	imported/21170/0	t	0	492	2025-10-24 00:47:09.255228	2025-10-24 00:47:09.255228
545	http://localhost:3000/uploads/2024/09/21171-01-1.png	imported/21171/0	t	0	493	2025-10-24 00:47:09.269626	2025-10-24 00:47:09.269626
546	http://localhost:3000/uploads/2024/09/21172-01-2.png	imported/21172/0	t	0	494	2025-10-24 00:47:09.285906	2025-10-24 00:47:09.285906
547	http://localhost:3000/uploads/2024/09/21173-01-2.png	imported/21173/0	t	0	495	2025-10-24 00:47:09.300662	2025-10-24 00:47:09.300662
548	http://localhost:3000/uploads/2024/09/21174-01-2.png	imported/21174/0	t	0	496	2025-10-24 00:47:09.315119	2025-10-24 00:47:09.315119
549	http://localhost:3000/uploads/2024/09/21175-01-2.png	imported/21175/0	t	0	497	2025-10-24 00:47:09.330635	2025-10-24 00:47:09.330635
550	http://localhost:3000/uploads/2024/09/21176-01-1.png	imported/21176/0	t	0	498	2025-10-24 00:47:09.343772	2025-10-24 00:47:09.343772
551	http://localhost:3000/uploads/2024/09/21178-01-1.png	imported/21178/0	t	0	500	2025-10-24 00:47:09.363053	2025-10-24 00:47:09.363053
552	http://localhost:3000/uploads/2024/10/21179-01.png	imported/21179/0	t	0	501	2025-10-24 00:47:09.3777	2025-10-24 00:47:09.3777
553	http://localhost:3000/uploads/2024/09/21180-01-2.png	imported/21180/0	t	0	502	2025-10-24 00:47:09.391341	2025-10-24 00:47:09.391341
554	http://localhost:3000/uploads/2024/09/21181-01.png	imported/21181/0	t	0	503	2025-10-24 00:47:09.403599	2025-10-24 00:47:09.403599
555	http://localhost:3000/uploads/2024/10/21182-01.png	imported/21182/0	t	0	504	2025-10-24 00:47:09.416487	2025-10-24 00:47:09.416487
556	http://localhost:3000/uploads/2024/10/21183-01.png	imported/21183/0	t	0	505	2025-10-24 00:47:09.42959	2025-10-24 00:47:09.42959
557	http://localhost:3000/uploads/2024/10/21184-01.png	imported/21184/0	t	0	506	2025-10-24 00:47:09.442375	2025-10-24 00:47:09.442375
558	http://localhost:3000/uploads/2024/10/21185-01.png	imported/21185/0	t	0	507	2025-10-24 00:47:09.454783	2025-10-24 00:47:09.454783
559	http://localhost:3000/uploads/2024/10/21186-01.png	imported/21186/0	t	0	508	2025-10-24 00:47:09.466932	2025-10-24 00:47:09.466932
560	http://localhost:3000/uploads/2024/10/21187-01.png	imported/21187/0	t	0	509	2025-10-24 00:47:09.479111	2025-10-24 00:47:09.479111
561	http://localhost:3000/uploads/2024/10/21188-01.png	imported/21188/0	t	0	510	2025-10-24 00:47:09.491693	2025-10-24 00:47:09.491693
562	http://localhost:3000/uploads/2024/10/21190-01.png	imported/21190/0	t	0	511	2025-10-24 00:47:09.503921	2025-10-24 00:47:09.503921
563	http://localhost:3000/uploads/2024/10/21191-01.png	imported/21191/0	t	0	512	2025-10-24 00:47:09.51593	2025-10-24 00:47:09.51593
564	http://localhost:3000/uploads/2024/10/21192-01.png	imported/21192/0	t	0	513	2025-10-24 00:47:09.546763	2025-10-24 00:47:09.546763
565	http://localhost:3000/uploads/2024/10/21193-01.png	imported/21193/0	t	0	514	2025-10-24 00:47:09.563188	2025-10-24 00:47:09.563188
566	http://localhost:3000/uploads/2024/10/21194-01.png	imported/21194/0	t	0	515	2025-10-24 00:47:09.577982	2025-10-24 00:47:09.577982
567	http://localhost:3000/uploads/2024/10/21201-01.png	imported/21201/0	t	0	516	2025-10-24 00:47:09.592893	2025-10-24 00:47:09.592893
568	http://localhost:3000/uploads/2024/10/21206-01.png	imported/21206/0	t	0	517	2025-10-24 00:47:09.606321	2025-10-24 00:47:09.606321
569	http://localhost:3000/uploads/2024/10/21207-01.png	imported/21207/0	t	0	518	2025-10-24 00:47:09.619936	2025-10-24 00:47:09.619936
570	http://localhost:3000/uploads/2024/10/21208-01.png	imported/21208/0	t	0	519	2025-10-24 00:47:09.636957	2025-10-24 00:47:09.636957
571	http://localhost:3000/uploads/2024/10/21209-01.png	imported/21209/0	t	0	520	2025-10-24 00:47:09.653101	2025-10-24 00:47:09.653101
572	http://localhost:3000/uploads/2024/10/21210-01.png	imported/21210/0	t	0	521	2025-10-24 00:47:09.667767	2025-10-24 00:47:09.667767
573	http://localhost:3000/uploads/2024/10/21217-01.png	imported/21217/0	t	0	522	2025-10-24 00:47:09.682397	2025-10-24 00:47:09.682397
574	http://localhost:3000/uploads/2024/10/21261-01.png	imported/21261/0	t	0	523	2025-10-24 00:47:09.696233	2025-10-24 00:47:09.696233
575	http://localhost:3000/uploads/2024/10/21273-01.png	imported/21273/0	t	0	524	2025-10-24 00:47:09.709687	2025-10-24 00:47:09.709687
576	http://localhost:3000/uploads/2024/10/21295-01.png	imported/21295/0	t	0	525	2025-10-24 00:47:09.723241	2025-10-24 00:47:09.723241
577	http://localhost:3000/uploads/2024/10/21296-01.png	imported/21296/0	t	0	526	2025-10-24 00:47:09.737581	2025-10-24 00:47:09.737581
578	http://localhost:3000/uploads/2024/10/21298-01.png	imported/21298/0	t	0	528	2025-10-24 00:47:09.757045	2025-10-24 00:47:09.757045
579	http://localhost:3000/uploads/2024/10/21299-01.png	imported/21299/0	t	0	529	2025-10-24 00:47:09.773896	2025-10-24 00:47:09.773896
580	http://localhost:3000/uploads/2024/10/21300-01.png	imported/21300/0	t	0	530	2025-10-24 00:47:09.789864	2025-10-24 00:47:09.789864
581	http://localhost:3000/uploads/2024/10/21302-01.png	imported/21302/0	t	0	531	2025-10-24 00:47:09.80433	2025-10-24 00:47:09.80433
582	http://localhost:3000/uploads/2024/10/21303-01.png	imported/21303/0	t	0	532	2025-10-24 00:47:09.81959	2025-10-24 00:47:09.81959
583	http://localhost:3000/uploads/2024/10/21304-01.png	imported/21304/0	t	0	533	2025-10-24 00:47:09.833751	2025-10-24 00:47:09.833751
584	http://localhost:3000/uploads/2024/10/21305-01.png	imported/21305/0	t	0	534	2025-10-24 00:47:09.848239	2025-10-24 00:47:09.848239
585	http://localhost:3000/uploads/2024/10/21306-01.png	imported/21306/0	t	0	535	2025-10-24 00:47:09.862633	2025-10-24 00:47:09.862633
586	http://localhost:3000/uploads/2024/10/21307-01.png	imported/21307/0	t	0	536	2025-10-24 00:47:09.877765	2025-10-24 00:47:09.877765
587	http://localhost:3000/uploads/2024/10/21309-01.png	imported/21309/0	t	0	537	2025-10-24 00:47:09.892703	2025-10-24 00:47:09.892703
588	http://localhost:3000/uploads/2024/10/21311-01.png	imported/21311/0	t	0	538	2025-10-24 00:47:09.909275	2025-10-24 00:47:09.909275
589	http://localhost:3000/uploads/2024/10/21315-01.png	imported/21315/0	t	0	539	2025-10-24 00:47:09.923871	2025-10-24 00:47:09.923871
590	http://localhost:3000/uploads/2024/10/21316-01.png	imported/21316/0	t	0	540	2025-10-24 00:47:09.938218	2025-10-24 00:47:09.938218
591	http://localhost:3000/uploads/2024/10/21317-01.png	imported/21317/0	t	0	541	2025-10-24 00:47:09.952404	2025-10-24 00:47:09.952404
592	http://localhost:3000/uploads/2024/10/21318-01.png	imported/21318/0	t	0	542	2025-10-24 00:47:09.966222	2025-10-24 00:47:09.966222
593	http://localhost:3000/uploads/2024/10/21325-01-1.png	imported/21325/0	t	0	543	2025-10-24 00:47:09.979608	2025-10-24 00:47:09.979608
594	http://localhost:3000/uploads/2024/10/21326-01.png	imported/21326/0	t	0	544	2025-10-24 00:47:09.992662	2025-10-24 00:47:09.992662
595	http://localhost:3000/uploads/2024/10/21327-01.png	imported/21327/0	t	0	545	2025-10-24 00:47:10.005587	2025-10-24 00:47:10.005587
596	http://localhost:3000/uploads/2024/10/21329-01.png	imported/21329/0	t	0	546	2025-10-24 00:47:10.037081	2025-10-24 00:47:10.037081
597	http://localhost:3000/uploads/2024/10/21330-01.png	imported/21330/0	t	0	547	2025-10-24 00:47:10.051409	2025-10-24 00:47:10.051409
598	http://localhost:3000/uploads/2024/10/21331-01.png	imported/21331/0	t	0	548	2025-10-24 00:47:10.066173	2025-10-24 00:47:10.066173
599	http://localhost:3000/uploads/2024/10/21332-01.png	imported/21332/0	t	0	549	2025-10-24 00:47:10.080017	2025-10-24 00:47:10.080017
600	http://localhost:3000/uploads/2024/10/21333-01.png	imported/21333/0	t	0	550	2025-10-24 00:47:10.093627	2025-10-24 00:47:10.093627
601	http://localhost:3000/uploads/2024/10/21334-01.png	imported/21334/0	t	0	551	2025-10-24 00:47:10.107172	2025-10-24 00:47:10.107172
602	http://localhost:3000/uploads/2024/10/21336-01.png	imported/21336/0	t	0	552	2025-10-24 00:47:10.120429	2025-10-24 00:47:10.120429
603	http://localhost:3000/uploads/2024/10/21337-01.png	imported/21337/0	t	0	553	2025-10-24 00:47:10.136075	2025-10-24 00:47:10.136075
604	http://localhost:3000/uploads/2024/10/21339-01.png	imported/21339/0	t	0	554	2025-10-24 00:47:10.15117	2025-10-24 00:47:10.15117
605	http://localhost:3000/uploads/2024/10/21340-01.png	imported/21340/0	t	0	555	2025-10-24 00:47:10.165427	2025-10-24 00:47:10.165427
606	http://localhost:3000/uploads/2024/10/21343-01.png	imported/21343/0	t	0	556	2025-10-24 00:47:10.178278	2025-10-24 00:47:10.178278
607	http://localhost:3000/uploads/2024/10/21344-01.png	imported/21344/0	t	0	557	2025-10-24 00:47:10.190545	2025-10-24 00:47:10.190545
608	http://localhost:3000/uploads/2024/10/21345-01.png	imported/21345/0	t	0	558	2025-10-24 00:47:10.202776	2025-10-24 00:47:10.202776
609	http://localhost:3000/uploads/2024/10/21346-01.png	imported/21346/0	t	0	559	2025-10-24 00:47:10.215544	2025-10-24 00:47:10.215544
610	http://localhost:3000/uploads/2024/10/21348-01.png	imported/21348/0	t	0	560	2025-10-24 00:47:10.230023	2025-10-24 00:47:10.230023
611	http://localhost:3000/uploads/2024/10/21349-01.png	imported/21349/0	t	0	561	2025-10-24 00:47:10.242331	2025-10-24 00:47:10.242331
612	http://localhost:3000/uploads/2024/10/21351-01.png	imported/21351/0	t	0	562	2025-10-24 00:47:10.255193	2025-10-24 00:47:10.255193
613	http://localhost:3000/uploads/2024/10/21352-01.png	imported/21352/0	t	0	563	2025-10-24 00:47:10.267985	2025-10-24 00:47:10.267985
614	http://localhost:3000/uploads/2024/10/21357-01.png	imported/21357/0	t	0	565	2025-10-24 00:47:10.286042	2025-10-24 00:47:10.286042
615	http://localhost:3000/uploads/2024/10/21358-01.png	imported/21358/0	t	0	566	2025-10-24 00:47:10.299435	2025-10-24 00:47:10.299435
616	http://localhost:3000/uploads/2024/10/21359-01.png	imported/21359/0	t	0	567	2025-10-24 00:47:10.312881	2025-10-24 00:47:10.312881
617	http://localhost:3000/uploads/2024/10/21360-01.png	imported/21360/0	t	0	568	2025-10-24 00:47:10.326178	2025-10-24 00:47:10.326178
618	http://localhost:3000/uploads/2024/10/21361-01.png	imported/21361/0	t	0	569	2025-10-24 00:47:10.342485	2025-10-24 00:47:10.342485
619	http://localhost:3000/uploads/2024/10/21364-01.png	imported/21364/0	t	0	570	2025-10-24 00:47:10.357445	2025-10-24 00:47:10.357445
620	http://localhost:3000/uploads/2024/10/21366-01.png	imported/21366/0	t	0	571	2025-10-24 00:47:10.37085	2025-10-24 00:47:10.37085
621	http://localhost:3000/uploads/2024/10/21368-01.png	imported/21368/0	t	0	572	2025-10-24 00:47:10.38553	2025-10-24 00:47:10.38553
622	http://localhost:3000/uploads/2024/10/21369-01.png	imported/21369/0	t	0	573	2025-10-24 00:47:10.399115	2025-10-24 00:47:10.399115
623	http://localhost:3000/uploads/2024/10/21370-01.png	imported/21370/0	t	0	574	2025-10-24 00:47:10.412707	2025-10-24 00:47:10.412707
624	http://localhost:3000/uploads/2024/10/21371-01.png	imported/21371/0	t	0	575	2025-10-24 00:47:10.427037	2025-10-24 00:47:10.427037
625	http://localhost:3000/uploads/2024/10/21375-01.png	imported/21375/0	t	0	576	2025-10-24 00:47:10.440526	2025-10-24 00:47:10.440526
626	http://localhost:3000/uploads/2024/10/21376-01.png	imported/21376/0	t	0	577	2025-10-24 00:47:10.455755	2025-10-24 00:47:10.455755
627	http://localhost:3000/uploads/2024/10/21377-01.png	imported/21377/0	t	0	578	2025-10-24 00:47:10.486651	2025-10-24 00:47:10.486651
628	http://localhost:3000/uploads/2024/10/21381-01.png	imported/21381/0	t	0	579	2025-10-24 00:47:10.499805	2025-10-24 00:47:10.499805
629	http://localhost:3000/uploads/2024/10/21383-01.png	imported/21383/0	t	0	580	2025-10-24 00:47:10.513416	2025-10-24 00:47:10.513416
630	http://localhost:3000/uploads/2024/10/21384-01.png	imported/21384/0	t	0	581	2025-10-24 00:47:10.526558	2025-10-24 00:47:10.526558
631	http://localhost:3000/uploads/2024/10/21385-01.png	imported/21385/0	t	0	582	2025-10-24 00:47:10.53975	2025-10-24 00:47:10.53975
632	http://localhost:3000/uploads/2024/10/21386-01.png	imported/21386/0	t	0	583	2025-10-24 00:47:10.552954	2025-10-24 00:47:10.552954
633	http://localhost:3000/uploads/2024/10/21391-01.png	imported/21391/0	t	0	585	2025-10-24 00:47:10.573211	2025-10-24 00:47:10.573211
634	http://localhost:3000/uploads/2024/10/21392-01.png	imported/21392/0	t	0	586	2025-10-24 00:47:10.587341	2025-10-24 00:47:10.587341
635	http://localhost:3000/uploads/2024/10/21393-01.png	imported/21393/0	t	0	587	2025-10-24 00:47:10.601141	2025-10-24 00:47:10.601141
636	http://localhost:3000/uploads/2024/10/21394-01.png	imported/21394/0	t	0	588	2025-10-24 00:47:10.614666	2025-10-24 00:47:10.614666
637	http://localhost:3000/uploads/2024/10/21395-01.png	imported/21395/0	t	0	589	2025-10-24 00:47:10.628571	2025-10-24 00:47:10.628571
638	http://localhost:3000/uploads/2024/10/21396-01.png	imported/21396/0	t	0	590	2025-10-24 00:47:10.641725	2025-10-24 00:47:10.641725
639	http://localhost:3000/uploads/2024/10/21397-01.png	imported/21397/0	t	0	591	2025-10-24 00:47:10.655195	2025-10-24 00:47:10.655195
640	http://localhost:3000/uploads/2024/10/21400-01.png	imported/21400/0	t	0	592	2025-10-24 00:47:10.668735	2025-10-24 00:47:10.668735
641	http://localhost:3000/uploads/2024/10/21404-01.png	imported/21404/0	t	0	593	2025-10-24 00:47:10.685009	2025-10-24 00:47:10.685009
642	http://localhost:3000/uploads/2024/10/21413-01.png	imported/21413/0	t	0	594	2025-10-24 00:47:10.699056	2025-10-24 00:47:10.699056
643	http://localhost:3000/uploads/2024/10/21414-01.png	imported/21414/0	t	0	595	2025-10-24 00:47:10.712623	2025-10-24 00:47:10.712623
644	http://localhost:3000/uploads/2024/10/21415-01.png	imported/21415/0	t	0	596	2025-10-24 00:47:10.726606	2025-10-24 00:47:10.726606
645	http://localhost:3000/uploads/2024/10/21416-01.png	imported/21416/0	t	0	597	2025-10-24 00:47:10.741228	2025-10-24 00:47:10.741228
646	http://localhost:3000/uploads/2024/10/21417-01.png	imported/21417/0	t	0	598	2025-10-24 00:47:10.755753	2025-10-24 00:47:10.755753
647	http://localhost:3000/uploads/2024/10/21418-01.png	imported/21418/0	t	0	599	2025-10-24 00:47:10.770326	2025-10-24 00:47:10.770326
648	http://localhost:3000/uploads/2024/10/21419-01.png	imported/21419/0	t	0	600	2025-10-24 00:47:10.785003	2025-10-24 00:47:10.785003
649	http://localhost:3000/uploads/2024/10/21420-01.png	imported/21420/0	t	0	601	2025-10-24 00:47:10.799511	2025-10-24 00:47:10.799511
650	http://localhost:3000/uploads/2024/10/21421-01.png	imported/21421/0	t	0	602	2025-10-24 00:47:10.812631	2025-10-24 00:47:10.812631
651	http://localhost:3000/uploads/2024/10/21422-01.png	imported/21422/0	t	0	603	2025-10-24 00:47:10.825603	2025-10-24 00:47:10.825603
652	http://localhost:3000/uploads/2024/10/21423-01.png	imported/21423/0	t	0	604	2025-10-24 00:47:10.840409	2025-10-24 00:47:10.840409
653	http://localhost:3000/uploads/2024/10/21425-01.png	imported/21425/0	t	0	605	2025-10-24 00:47:10.853666	2025-10-24 00:47:10.853666
654	http://localhost:3000/uploads/2024/10/21426-01.png	imported/21426/0	t	0	606	2025-10-24 00:47:10.865878	2025-10-24 00:47:10.865878
655	http://localhost:3000/uploads/2024/10/21427-01.png	imported/21427/0	t	0	607	2025-10-24 00:47:10.878072	2025-10-24 00:47:10.878072
656	http://localhost:3000/uploads/2024/10/21428-01.png	imported/21428/0	t	0	608	2025-10-24 00:47:10.893354	2025-10-24 00:47:10.893354
657	http://localhost:3000/uploads/2024/10/21429-01.png	imported/21429/0	t	0	609	2025-10-24 00:47:10.907528	2025-10-24 00:47:10.907528
658	http://localhost:3000/uploads/2024/10/21430-01.png	imported/21430/0	t	0	610	2025-10-24 00:47:10.920879	2025-10-24 00:47:10.920879
659	http://localhost:3000/uploads/2024/10/21431-01.png	imported/21431/0	t	0	611	2025-10-24 00:47:10.950772	2025-10-24 00:47:10.950772
660	http://localhost:3000/uploads/2024/10/21432-01.png	imported/21432/0	t	0	612	2025-10-24 00:47:10.964398	2025-10-24 00:47:10.964398
661	http://localhost:3000/uploads/2024/10/21433-01.png	imported/21433/0	t	0	613	2025-10-24 00:47:10.980543	2025-10-24 00:47:10.980543
662	http://localhost:3000/uploads/2024/10/21434-01.png	imported/21434/0	t	0	614	2025-10-24 00:47:10.995512	2025-10-24 00:47:10.995512
663	http://localhost:3000/uploads/2024/10/21437-01.png	imported/21437/0	t	0	615	2025-10-24 00:47:11.009643	2025-10-24 00:47:11.009643
664	http://localhost:3000/uploads/2024/10/21438-01.png	imported/21438/0	t	0	616	2025-10-24 00:47:11.023057	2025-10-24 00:47:11.023057
665	http://localhost:3000/uploads/2024/10/21439-01.png	imported/21439/0	t	0	617	2025-10-24 00:47:11.036216	2025-10-24 00:47:11.036216
666	http://localhost:3000/uploads/2024/10/21441-01.png	imported/21441/0	t	0	618	2025-10-24 00:47:11.050756	2025-10-24 00:47:11.050756
667	http://localhost:3000/uploads/2024/10/21443-01.png	imported/21443/0	t	0	619	2025-10-24 00:47:11.066486	2025-10-24 00:47:11.066486
668	http://localhost:3000/uploads/2024/10/21444-01.png	imported/21444/0	t	0	620	2025-10-24 00:47:11.080708	2025-10-24 00:47:11.080708
669	http://localhost:3000/uploads/2024/10/21447-01-1.png	imported/21447/0	t	0	621	2025-10-24 00:47:11.097843	2025-10-24 00:47:11.097843
670	http://localhost:3000/uploads/2024/10/21450-01.png	imported/21450/0	t	0	622	2025-10-24 00:47:11.112429	2025-10-24 00:47:11.112429
671	http://localhost:3000/uploads/2024/10/21451-01.png	imported/21451/0	t	0	623	2025-10-24 00:47:11.125292	2025-10-24 00:47:11.125292
672	http://localhost:3000/uploads/2024/10/21452-01.png	imported/21452/0	t	0	624	2025-10-24 00:47:11.139515	2025-10-24 00:47:11.139515
673	http://localhost:3000/uploads/2024/10/21453-01.png	imported/21453/0	t	0	625	2025-10-24 00:47:11.152947	2025-10-24 00:47:11.152947
674	http://localhost:3000/uploads/2024/10/21455-01.png	imported/21455/0	t	0	626	2025-10-24 00:47:11.166259	2025-10-24 00:47:11.166259
675	http://localhost:3000/uploads/2024/10/21457-01.png	imported/21457/0	t	0	627	2025-10-24 00:47:11.179601	2025-10-24 00:47:11.179601
676	http://localhost:3000/uploads/2024/10/21503-01.png	imported/21503/0	t	0	628	2025-10-24 00:47:11.19303	2025-10-24 00:47:11.19303
677	http://localhost:3000/uploads/2024/10/21505-01.png	imported/21505/0	t	0	629	2025-10-24 00:47:11.207255	2025-10-24 00:47:11.207255
678	http://localhost:3000/uploads/2024/10/21514-01.png	imported/21514/0	t	0	630	2025-10-24 00:47:11.221294	2025-10-24 00:47:11.221294
679	http://localhost:3000/uploads/2024/10/21519-01.png	imported/21519/0	t	0	631	2025-10-24 00:47:11.235031	2025-10-24 00:47:11.235031
680	http://localhost:3000/uploads/2024/10/21520-01.png	imported/21520/0	t	0	632	2025-10-24 00:47:11.248853	2025-10-24 00:47:11.248853
681	http://localhost:3000/uploads/2024/10/21529-01.png	imported/21529/0	t	0	633	2025-10-24 00:47:11.262333	2025-10-24 00:47:11.262333
682	http://localhost:3000/uploads/2024/10/21531-01.png	imported/21531/0	t	0	634	2025-10-24 00:47:11.27726	2025-10-24 00:47:11.27726
683	http://localhost:3000/uploads/2024/10/21533-01.png	imported/21533/0	t	0	635	2025-10-24 00:47:11.29301	2025-10-24 00:47:11.29301
684	http://localhost:3000/uploads/2024/10/21545-01.png	imported/21545/0	t	0	636	2025-10-24 00:47:11.307331	2025-10-24 00:47:11.307331
685	http://localhost:3000/uploads/2024/10/21548-01.png	imported/21548/0	t	0	637	2025-10-24 00:47:11.321267	2025-10-24 00:47:11.321267
686	http://localhost:3000/uploads/2024/10/21549-01.png	imported/21549/0	t	0	638	2025-10-24 00:47:11.335117	2025-10-24 00:47:11.335117
687	http://localhost:3000/uploads/2024/10/21554-01.png	imported/21554/0	t	0	639	2025-10-24 00:47:11.348439	2025-10-24 00:47:11.348439
688	http://localhost:3000/uploads/2024/10/21556-01.png	imported/21556/0	t	0	640	2025-10-24 00:47:11.361189	2025-10-24 00:47:11.361189
689	http://localhost:3000/uploads/2024/10/21557-01.png	imported/21557/0	t	0	641	2025-10-24 00:47:11.373709	2025-10-24 00:47:11.373709
690	http://localhost:3000/uploads/2024/10/21558-01.png	imported/21558/0	t	0	642	2025-10-24 00:47:11.386883	2025-10-24 00:47:11.386883
691	http://localhost:3000/uploads/2024/10/21561-01.png	imported/21561/0	t	0	643	2025-10-24 00:47:11.418358	2025-10-24 00:47:11.418358
692	http://localhost:3000/uploads/2024/10/21562-01.png	imported/21562/0	t	0	644	2025-10-24 00:47:11.432746	2025-10-24 00:47:11.432746
693	http://localhost:3000/uploads/2024/10/21563-01.png	imported/21563/0	t	0	645	2025-10-24 00:47:11.44707	2025-10-24 00:47:11.44707
694	http://localhost:3000/uploads/2024/10/21564-01.png	imported/21564/0	t	0	646	2025-10-24 00:47:11.460673	2025-10-24 00:47:11.460673
695	http://localhost:3000/uploads/2024/10/21567-01.png	imported/21567/0	t	0	647	2025-10-24 00:47:11.474575	2025-10-24 00:47:11.474575
696	http://localhost:3000/uploads/2024/10/21568-01.png	imported/21568/0	t	0	648	2025-10-24 00:47:11.490685	2025-10-24 00:47:11.490685
697	http://localhost:3000/uploads/2024/10/21570-01.png	imported/21570/0	t	0	649	2025-10-24 00:47:11.504897	2025-10-24 00:47:11.504897
698	http://localhost:3000/uploads/2024/10/21572-01.png	imported/21572/0	t	0	650	2025-10-24 00:47:11.518496	2025-10-24 00:47:11.518496
699	http://localhost:3000/uploads/2024/10/21576-01.png	imported/21576/0	t	0	651	2025-10-24 00:47:11.532369	2025-10-24 00:47:11.532369
700	http://localhost:3000/uploads/2024/10/21589-01.png	imported/21589/0	t	0	652	2025-10-24 00:47:11.547476	2025-10-24 00:47:11.547476
701	http://localhost:3000/uploads/2024/10/22244-01-2.png	imported/22244/0	t	0	653	2025-10-24 00:47:11.562065	2025-10-24 00:47:11.562065
702	http://localhost:3000/uploads/2024/10/22244-01.png	imported/22244/1	f	1	653	2025-10-24 00:47:11.565466	2025-10-24 00:47:11.565466
703	http://localhost:3000/uploads/2024/10/22248-01.png	imported/22248/0	t	0	654	2025-10-24 00:47:11.579934	2025-10-24 00:47:11.579934
704	http://localhost:3000/uploads/2024/10/22256-01.png	imported/22256/0	t	0	655	2025-10-24 00:47:11.593969	2025-10-24 00:47:11.593969
705	http://localhost:3000/uploads/2024/10/22524-01.png	imported/22524/0	t	0	656	2025-10-24 00:47:11.608319	2025-10-24 00:47:11.608319
706	http://localhost:3000/uploads/2024/10/22525-01.png	imported/22525/0	t	0	657	2025-10-24 00:47:11.622796	2025-10-24 00:47:11.622796
707	http://localhost:3000/uploads/2024/10/23566-01.png	imported/23566/0	t	0	658	2025-10-24 00:47:11.640146	2025-10-24 00:47:11.640146
708	http://localhost:3000/uploads/2024/10/25138-01.png	imported/25138/0	t	0	659	2025-10-24 00:47:11.657253	2025-10-24 00:47:11.657253
709	http://localhost:3000/uploads/2024/10/25375-01.png	imported/25375/0	t	0	660	2025-10-24 00:47:11.673745	2025-10-24 00:47:11.673745
710	http://localhost:3000/uploads/2024/10/25384-01.png	imported/25384/0	t	0	661	2025-10-24 00:47:11.689768	2025-10-24 00:47:11.689768
711	http://localhost:3000/uploads/2024/10/25405-01-2.png	imported/25405/0	t	0	662	2025-10-24 00:47:11.704593	2025-10-24 00:47:11.704593
712	http://localhost:3000/uploads/2024/10/25405-01.png	imported/25405/1	f	1	662	2025-10-24 00:47:11.707965	2025-10-24 00:47:11.707965
713	http://localhost:3000/uploads/2024/10/25554-01.png	imported/25554/0	t	0	663	2025-10-24 00:47:11.723085	2025-10-24 00:47:11.723085
714	http://localhost:3000/uploads/2024/10/25555-01.png	imported/25555/0	t	0	664	2025-10-24 00:47:11.738533	2025-10-24 00:47:11.738533
715	http://localhost:3000/uploads/2024/10/25566-01.png	imported/25566/0	t	0	665	2025-10-24 00:47:11.757721	2025-10-24 00:47:11.757721
716	http://localhost:3000/uploads/2024/10/25570-01.png	imported/25570/0	t	0	666	2025-10-24 00:47:11.79146	2025-10-24 00:47:11.79146
717	http://localhost:3000/uploads/2024/10/25582-01.png	imported/25582/0	t	0	667	2025-10-24 00:47:11.807881	2025-10-24 00:47:11.807881
718	http://localhost:3000/uploads/2024/10/25588-01.png	imported/25588/0	t	0	668	2025-10-24 00:47:11.823141	2025-10-24 00:47:11.823141
719	http://localhost:3000/uploads/2024/10/25596-01.png	imported/25596/0	t	0	669	2025-10-24 00:47:11.838617	2025-10-24 00:47:11.838617
720	http://localhost:3000/uploads/2024/10/25659-01.png	imported/25659/0	t	0	670	2025-10-24 00:47:11.855647	2025-10-24 00:47:11.855647
721	http://localhost:3000/uploads/2024/10/25662-01.png	imported/25662/0	t	0	671	2025-10-24 00:47:11.872895	2025-10-24 00:47:11.872895
722	http://localhost:3000/uploads/2024/10/25939-01.png	imported/25939/0	t	0	672	2025-10-24 00:47:11.887793	2025-10-24 00:47:11.887793
723	http://localhost:3000/uploads/2024/10/26317-01.png	imported/26317/0	t	0	673	2025-10-24 00:47:11.903023	2025-10-24 00:47:11.903023
724	http://localhost:3000/uploads/2024/10/26413-01-2.png	imported/26413/0	t	0	674	2025-10-24 00:47:11.91776	2025-10-24 00:47:11.91776
725	http://localhost:3000/uploads/2024/10/26413-01.png	imported/26413/1	f	1	674	2025-10-24 00:47:11.921265	2025-10-24 00:47:11.921265
726	http://localhost:3000/uploads/2024/10/26449-01.png	imported/26449/0	t	0	675	2025-10-24 00:47:11.933674	2025-10-24 00:47:11.933674
727	http://localhost:3000/uploads/2024/10/26541-01.png	imported/26541/0	t	0	676	2025-10-24 00:47:11.947042	2025-10-24 00:47:11.947042
728	http://localhost:3000/uploads/2024/10/26542-01.png	imported/26542/0	t	0	677	2025-10-24 00:47:11.960105	2025-10-24 00:47:11.960105
729	http://localhost:3000/uploads/2024/10/26543-01.png	imported/26543/0	t	0	678	2025-10-24 00:47:11.972374	2025-10-24 00:47:11.972374
730	http://localhost:3000/uploads/2024/10/26744-01.png	imported/26744/0	t	0	679	2025-10-24 00:47:11.98499	2025-10-24 00:47:11.98499
731	http://localhost:3000/uploads/2024/10/26750-01.png	imported/26750/0	t	0	680	2025-10-24 00:47:11.997101	2025-10-24 00:47:11.997101
732	http://localhost:3000/uploads/2024/10/27412-01.png	imported/27412/0	t	0	681	2025-10-24 00:47:12.00908	2025-10-24 00:47:12.00908
733	http://localhost:3000/uploads/2024/10/27432-01.png	imported/27432/0	t	0	682	2025-10-24 00:47:12.021153	2025-10-24 00:47:12.021153
734	http://localhost:3000/uploads/2024/10/28049-01.png	imported/28049/0	t	0	683	2025-10-24 00:47:12.033167	2025-10-24 00:47:12.033167
735	http://localhost:3000/uploads/2024/10/29092-01.png	imported/29092/0	t	0	684	2025-10-24 00:47:12.045786	2025-10-24 00:47:12.045786
736	http://localhost:3000/uploads/2024/10/29133-01.png	imported/29133/0	t	0	685	2025-10-24 00:47:12.060141	2025-10-24 00:47:12.060141
737	http://localhost:3000/uploads/2024/10/29214-01.png	imported/29214/0	t	0	686	2025-10-24 00:47:12.07227	2025-10-24 00:47:12.07227
738	http://localhost:3000/uploads/2024/10/29215-01.png	imported/29215/0	t	0	687	2025-10-24 00:47:12.086208	2025-10-24 00:47:12.086208
739	http://localhost:3000/uploads/2024/10/29235-01.png	imported/29235/0	t	0	688	2025-10-24 00:47:12.098786	2025-10-24 00:47:12.098786
740	http://localhost:3000/uploads/2024/10/30194-01.png	imported/30194/0	t	0	689	2025-10-24 00:47:12.111167	2025-10-24 00:47:12.111167
741	http://localhost:3000/uploads/2024/10/30195-01.png	imported/30195/0	t	0	690	2025-10-24 00:47:12.123174	2025-10-24 00:47:12.123174
742	http://localhost:3000/uploads/2024/10/31807-01.png	imported/31807/0	t	0	691	2025-10-24 00:47:12.137058	2025-10-24 00:47:12.137058
743	http://localhost:3000/uploads/2024/10/31808-01.png	imported/31808/0	t	0	692	2025-10-24 00:47:12.149206	2025-10-24 00:47:12.149206
744	http://localhost:3000/uploads/2024/10/31809-01.png	imported/31809/0	t	0	693	2025-10-24 00:47:12.161398	2025-10-24 00:47:12.161398
745	http://localhost:3000/uploads/2024/10/31810-01.png	imported/31810/0	t	0	694	2025-10-24 00:47:12.173329	2025-10-24 00:47:12.173329
746	http://localhost:3000/uploads/2024/10/31811-01.png	imported/31811/0	t	0	695	2025-10-24 00:47:12.185929	2025-10-24 00:47:12.185929
747	http://localhost:3000/uploads/2024/10/31812-01.png	imported/31812/0	t	0	696	2025-10-24 00:47:12.197936	2025-10-24 00:47:12.197936
748	http://localhost:3000/uploads/2024/10/32000-01.png	imported/32000/0	t	0	697	2025-10-24 00:47:12.229519	2025-10-24 00:47:12.229519
749	http://localhost:3000/uploads/2024/10/32004-01.png	imported/32004/0	t	0	698	2025-10-24 00:47:12.243629	2025-10-24 00:47:12.243629
750	http://localhost:3000/uploads/2024/10/32006-01.png	imported/32006/0	t	0	699	2025-10-24 00:47:12.258456	2025-10-24 00:47:12.258456
751	http://localhost:3000/uploads/2024/10/32007-01.png	imported/32007/0	t	0	700	2025-10-24 00:47:12.27296	2025-10-24 00:47:12.27296
752	http://localhost:3000/uploads/2024/10/32008-01.png	imported/32008/0	t	0	701	2025-10-24 00:47:12.286984	2025-10-24 00:47:12.286984
753	http://localhost:3000/uploads/2024/10/32009-01.png	imported/32009/0	t	0	702	2025-10-24 00:47:12.30058	2025-10-24 00:47:12.30058
754	http://localhost:3000/uploads/2024/10/32011-01.png	imported/32011/0	t	0	703	2025-10-24 00:47:12.31522	2025-10-24 00:47:12.31522
755	http://localhost:3000/uploads/2024/10/32012-01.png	imported/32012/0	t	0	704	2025-10-24 00:47:12.328523	2025-10-24 00:47:12.328523
756	http://localhost:3000/uploads/2024/10/32013-01.png	imported/32013/0	t	0	705	2025-10-24 00:47:12.343167	2025-10-24 00:47:12.343167
757	http://localhost:3000/uploads/2024/10/32014-01.png	imported/32014/0	t	0	706	2025-10-24 00:47:12.35618	2025-10-24 00:47:12.35618
758	http://localhost:3000/uploads/2024/10/32015-01.png	imported/32015/0	t	0	707	2025-10-24 00:47:12.36851	2025-10-24 00:47:12.36851
759	http://localhost:3000/uploads/2024/10/32016-01.png	imported/32016/0	t	0	708	2025-10-24 00:47:12.380555	2025-10-24 00:47:12.380555
760	http://localhost:3000/uploads/2024/10/32019-01.png	imported/32019/0	t	0	709	2025-10-24 00:47:12.393044	2025-10-24 00:47:12.393044
761	http://localhost:3000/uploads/2024/10/32020-01.png	imported/32020/0	t	0	710	2025-10-24 00:47:12.405231	2025-10-24 00:47:12.405231
762	http://localhost:3000/uploads/2024/10/32021-01.png	imported/32021/0	t	0	711	2025-10-24 00:47:12.417317	2025-10-24 00:47:12.417317
763	http://localhost:3000/uploads/2024/10/32022-01.png	imported/32022/0	t	0	712	2025-10-24 00:47:12.429262	2025-10-24 00:47:12.429262
764	http://localhost:3000/uploads/2024/10/32023-01.png	imported/32023/0	t	0	713	2025-10-24 00:47:12.441326	2025-10-24 00:47:12.441326
765	http://localhost:3000/uploads/2024/10/32026-01.png	imported/32026/0	t	0	714	2025-10-24 00:47:12.453429	2025-10-24 00:47:12.453429
766	http://localhost:3000/uploads/2024/10/32027-01-2.png	imported/32027/0	t	0	715	2025-10-24 00:47:12.465846	2025-10-24 00:47:12.465846
767	http://localhost:3000/uploads/2024/10/32027-01.png	imported/32027/1	f	1	715	2025-10-24 00:47:12.46865	2025-10-24 00:47:12.46865
768	http://localhost:3000/uploads/2024/10/32028-01.png	imported/32028/0	t	0	716	2025-10-24 00:47:12.481486	2025-10-24 00:47:12.481486
769	http://localhost:3000/uploads/2024/10/32029-01.png	imported/32029/0	t	0	717	2025-10-24 00:47:12.494546	2025-10-24 00:47:12.494546
770	http://localhost:3000/uploads/2024/10/32030-01.png	imported/32030/0	t	0	718	2025-10-24 00:47:12.507183	2025-10-24 00:47:12.507183
771	http://localhost:3000/uploads/2024/10/32031-01.png	imported/32031/0	t	0	719	2025-10-24 00:47:12.519452	2025-10-24 00:47:12.519452
772	http://localhost:3000/uploads/2024/10/32032-01.png	imported/32032/0	t	0	720	2025-10-24 00:47:12.531403	2025-10-24 00:47:12.531403
773	http://localhost:3000/uploads/2024/10/32035-01.png	imported/32035/0	t	0	722	2025-10-24 00:47:12.549836	2025-10-24 00:47:12.549836
774	http://localhost:3000/uploads/2024/10/32036-01.png	imported/32036/0	t	0	723	2025-10-24 00:47:12.565985	2025-10-24 00:47:12.565985
775	http://localhost:3000/uploads/2024/10/32037-01.png	imported/32037/0	t	0	724	2025-10-24 00:47:12.585867	2025-10-24 00:47:12.585867
776	http://localhost:3000/uploads/2024/10/32038-01.png	imported/32038/0	t	0	725	2025-10-24 00:47:12.600399	2025-10-24 00:47:12.600399
777	http://localhost:3000/uploads/2024/10/32039-01.png	imported/32039/0	t	0	726	2025-10-24 00:47:12.613185	2025-10-24 00:47:12.613185
778	http://localhost:3000/uploads/2024/10/32041-01.png	imported/32041/0	t	0	727	2025-10-24 00:47:12.626368	2025-10-24 00:47:12.626368
779	http://localhost:3000/uploads/2024/10/32044-01.png	imported/32044/0	t	0	728	2025-10-24 00:47:12.639307	2025-10-24 00:47:12.639307
780	http://localhost:3000/uploads/2024/10/32046-01.png	imported/32046/0	t	0	729	2025-10-24 00:47:12.66945	2025-10-24 00:47:12.66945
781	http://localhost:3000/uploads/2024/10/32048-01.png	imported/32048/0	t	0	730	2025-10-24 00:47:12.682655	2025-10-24 00:47:12.682655
782	http://localhost:3000/uploads/2024/10/32050-01.png	imported/32050/0	t	0	731	2025-10-24 00:47:12.696527	2025-10-24 00:47:12.696527
783	http://localhost:3000/uploads/2024/10/32064-01.png	imported/32064/0	t	0	732	2025-10-24 00:47:12.711196	2025-10-24 00:47:12.711196
784	http://localhost:3000/uploads/2024/10/32067-01.png	imported/32067/0	t	0	733	2025-10-24 00:47:12.724437	2025-10-24 00:47:12.724437
785	http://localhost:3000/uploads/2024/10/32068-01.png	imported/32068/0	t	0	734	2025-10-24 00:47:12.737389	2025-10-24 00:47:12.737389
786	http://localhost:3000/uploads/2024/10/32070-01.png	imported/32070/0	t	0	735	2025-10-24 00:47:12.752333	2025-10-24 00:47:12.752333
787	http://localhost:3000/uploads/2024/10/32071-01.png	imported/32071/0	t	0	736	2025-10-24 00:47:12.766518	2025-10-24 00:47:12.766518
788	http://localhost:3000/uploads/2024/10/32072-01.png	imported/32072/0	t	0	737	2025-10-24 00:47:12.778659	2025-10-24 00:47:12.778659
789	http://localhost:3000/uploads/2024/10/32073-01.png	imported/32073/0	t	0	738	2025-10-24 00:47:12.791078	2025-10-24 00:47:12.791078
790	http://localhost:3000/uploads/2024/10/32075-01.png	imported/32075/0	t	0	739	2025-10-24 00:47:12.803957	2025-10-24 00:47:12.803957
791	http://localhost:3000/uploads/2024/10/32079-01.png	imported/32079/0	t	0	740	2025-10-24 00:47:12.816005	2025-10-24 00:47:12.816005
792	http://localhost:3000/uploads/2024/10/32080-01.png	imported/32080/0	t	0	741	2025-10-24 00:47:12.827988	2025-10-24 00:47:12.827988
793	http://localhost:3000/uploads/2024/10/32081-01.png	imported/32081/0	t	0	742	2025-10-24 00:47:12.839955	2025-10-24 00:47:12.839955
794	http://localhost:3000/uploads/2024/10/32082-01-1.png	imported/32082/0	t	0	743	2025-10-24 00:47:12.852752	2025-10-24 00:47:12.852752
795	http://localhost:3000/uploads/2024/10/32084-01.png	imported/32084/0	t	0	744	2025-10-24 00:47:12.866586	2025-10-24 00:47:12.866586
796	http://localhost:3000/uploads/2024/10/32087-01.png	imported/32087/0	t	0	745	2025-10-24 00:47:12.87935	2025-10-24 00:47:12.87935
797	http://localhost:3000/uploads/2024/10/32089-01.png	imported/32089/0	t	0	746	2025-10-24 00:47:12.89237	2025-10-24 00:47:12.89237
798	http://localhost:3000/uploads/2024/10/32091-01.png	imported/32091/0	t	0	747	2025-10-24 00:47:12.906282	2025-10-24 00:47:12.906282
799	http://localhost:3000/uploads/2024/10/32104-01.png	imported/32104/0	t	0	748	2025-10-24 00:47:12.919854	2025-10-24 00:47:12.919854
800	http://localhost:3000/uploads/2024/10/32106-01.png	imported/32106/0	t	0	749	2025-10-24 00:47:12.933282	2025-10-24 00:47:12.933282
801	http://localhost:3000/uploads/2024/10/32107-01.png	imported/32107/0	t	0	750	2025-10-24 00:47:12.94685	2025-10-24 00:47:12.94685
802	http://localhost:3000/uploads/2024/10/32109-01.png	imported/32109/0	t	0	751	2025-10-24 00:47:12.963557	2025-10-24 00:47:12.963557
803	http://localhost:3000/uploads/2024/10/32110-01.png	imported/32110/0	t	0	752	2025-10-24 00:47:12.978518	2025-10-24 00:47:12.978518
804	http://localhost:3000/uploads/2024/10/32112-01.png	imported/32112/0	t	0	753	2025-10-24 00:47:12.99283	2025-10-24 00:47:12.99283
805	http://localhost:3000/uploads/2024/10/32113-01.png	imported/32113/0	t	0	754	2025-10-24 00:47:13.008941	2025-10-24 00:47:13.008941
806	http://localhost:3000/uploads/2024/10/32115-01.png	imported/32115/0	t	0	755	2025-10-24 00:47:13.025801	2025-10-24 00:47:13.025801
807	http://localhost:3000/uploads/2024/10/32116-01.png	imported/32116/0	t	0	756	2025-10-24 00:47:13.040513	2025-10-24 00:47:13.040513
808	http://localhost:3000/uploads/2024/10/32118-01.png	imported/32118/0	t	0	757	2025-10-24 00:47:13.056305	2025-10-24 00:47:13.056305
809	http://localhost:3000/uploads/2024/10/32119-01.png	imported/32119/0	t	0	758	2025-10-24 00:47:13.069172	2025-10-24 00:47:13.069172
810	http://localhost:3000/uploads/2024/10/32121-01.png	imported/32121/0	t	0	759	2025-10-24 00:47:13.081286	2025-10-24 00:47:13.081286
811	http://localhost:3000/uploads/2024/10/32124-01.png	imported/32124/0	t	0	760	2025-10-24 00:47:13.093712	2025-10-24 00:47:13.093712
812	http://localhost:3000/uploads/2024/10/32123-01.png	imported/32123/0	t	0	761	2025-10-24 00:47:13.125301	2025-10-24 00:47:13.125301
813	http://localhost:3000/uploads/2024/10/32132-01-1.png	imported/32132/0	t	0	762	2025-10-24 00:47:13.141652	2025-10-24 00:47:13.141652
814	http://localhost:3000/uploads/2024/10/32139-01.png	imported/32139/0	t	0	763	2025-10-24 00:47:13.155477	2025-10-24 00:47:13.155477
815	http://localhost:3000/uploads/2024/10/32140-01-1.png	imported/32140/0	t	0	764	2025-10-24 00:47:13.168428	2025-10-24 00:47:13.168428
816	http://localhost:3000/uploads/2024/10/32145-01-1.png	imported/32145/0	t	0	765	2025-10-24 00:47:13.181017	2025-10-24 00:47:13.181017
817	http://localhost:3000/uploads/2024/10/32146-01.png	imported/32146/0	t	0	766	2025-10-24 00:47:13.194125	2025-10-24 00:47:13.194125
818	http://localhost:3000/uploads/2024/10/32148-01.png	imported/32148/0	t	0	767	2025-10-24 00:47:13.206721	2025-10-24 00:47:13.206721
819	http://localhost:3000/uploads/2024/10/32149-01.png	imported/32149/0	t	0	768	2025-10-24 00:47:13.219266	2025-10-24 00:47:13.219266
820	http://localhost:3000/uploads/2024/10/32150-01.png	imported/32150/0	t	0	769	2025-10-24 00:47:13.232207	2025-10-24 00:47:13.232207
821	http://localhost:3000/uploads/2024/10/32154-01.png	imported/32154/0	t	0	770	2025-10-24 00:47:13.245559	2025-10-24 00:47:13.245559
822	http://localhost:3000/uploads/2024/10/32155-01.png	imported/32155/0	t	0	771	2025-10-24 00:47:13.258854	2025-10-24 00:47:13.258854
823	http://localhost:3000/uploads/2024/10/32160-01.png	imported/32160/0	t	0	772	2025-10-24 00:47:13.272148	2025-10-24 00:47:13.272148
824	http://localhost:3000/uploads/2024/10/32163-01.png	imported/32163/0	t	0	773	2025-10-24 00:47:13.286202	2025-10-24 00:47:13.286202
825	http://localhost:3000/uploads/2024/10/32164-01.png	imported/32164/0	t	0	774	2025-10-24 00:47:13.301053	2025-10-24 00:47:13.301053
826	http://localhost:3000/uploads/2024/10/32165-01.png	imported/32165/0	t	0	775	2025-10-24 00:47:13.314673	2025-10-24 00:47:13.314673
827	http://localhost:3000/uploads/2024/10/32180-01-1.png	imported/32180/0	t	0	776	2025-10-24 00:47:13.327298	2025-10-24 00:47:13.327298
828	http://localhost:3000/uploads/2024/10/32181-01.png	imported/32181/0	t	0	777	2025-10-24 00:47:13.339517	2025-10-24 00:47:13.339517
829	http://localhost:3000/uploads/2024/10/32182-01.png	imported/32182/0	t	0	778	2025-10-24 00:47:13.351678	2025-10-24 00:47:13.351678
830	http://localhost:3000/uploads/2024/10/32183-01.png	imported/32183/0	t	0	779	2025-10-24 00:47:13.364	2025-10-24 00:47:13.364
831	http://localhost:3000/uploads/2024/10/32184-01.png	imported/32184/0	t	0	780	2025-10-24 00:47:13.376313	2025-10-24 00:47:13.376313
832	http://localhost:3000/uploads/2024/10/32185-01.png	imported/32185/0	t	0	781	2025-10-24 00:47:13.388501	2025-10-24 00:47:13.388501
833	http://localhost:3000/uploads/2024/10/32186-01.png	imported/32186/0	t	0	782	2025-10-24 00:47:13.400843	2025-10-24 00:47:13.400843
834	http://localhost:3000/uploads/2024/10/32187-01.png	imported/32187/0	t	0	783	2025-10-24 00:47:13.413126	2025-10-24 00:47:13.413126
835	http://localhost:3000/uploads/2024/10/32188-01.png	imported/32188/0	t	0	784	2025-10-24 00:47:13.426133	2025-10-24 00:47:13.426133
836	http://localhost:3000/uploads/2024/10/32190-01.png	imported/32190/0	t	0	785	2025-10-24 00:47:13.438917	2025-10-24 00:47:13.438917
837	http://localhost:3000/uploads/2024/10/32194-01.png	imported/32194/0	t	0	786	2025-10-24 00:47:13.452863	2025-10-24 00:47:13.452863
838	http://localhost:3000/uploads/2024/10/32195-01.png	imported/32195/0	t	0	787	2025-10-24 00:47:13.467469	2025-10-24 00:47:13.467469
839	http://localhost:3000/uploads/2024/10/32201-01.png	imported/32201/0	t	0	788	2025-10-24 00:47:13.483758	2025-10-24 00:47:13.483758
840	http://localhost:3000/uploads/2024/10/32205-01.png	imported/32205/0	t	0	789	2025-10-24 00:47:13.497849	2025-10-24 00:47:13.497849
841	http://localhost:3000/uploads/2024/10/32877-01.png	imported/32877/0	t	0	790	2025-10-24 00:47:13.511464	2025-10-24 00:47:13.511464
842	http://localhost:3000/uploads/2024/10/32950-01.png	imported/32950/0	t	0	791	2025-10-24 00:47:13.524675	2025-10-24 00:47:13.524675
843	http://localhost:3000/uploads/2024/10/33698-01.png	imported/33698/0	t	0	792	2025-10-24 00:47:13.538105	2025-10-24 00:47:13.538105
844	http://localhost:3000/uploads/2024/10/33699-01.png	imported/33699/0	t	0	793	2025-10-24 00:47:13.570574	2025-10-24 00:47:13.570574
845	http://localhost:3000/uploads/2024/10/33700-01.png	imported/33700/0	t	0	794	2025-10-24 00:47:13.584102	2025-10-24 00:47:13.584102
846	http://localhost:3000/uploads/2024/10/33968-01.png	imported/33968/0	t	0	795	2025-10-24 00:47:13.598289	2025-10-24 00:47:13.598289
847	http://localhost:3000/uploads/2024/10/34491-01.png	imported/34491/0	t	0	796	2025-10-24 00:47:13.611597	2025-10-24 00:47:13.611597
848	http://localhost:3000/uploads/2024/10/34605-01.png	imported/34605/0	t	0	797	2025-10-24 00:47:13.624912	2025-10-24 00:47:13.624912
849	http://localhost:3000/uploads/2024/09/34609-01.png	imported/34609/0	t	0	798	2025-10-24 00:47:13.63811	2025-10-24 00:47:13.63811
850	http://localhost:3000/uploads/2024/09/34610-01.png	imported/34610/0	t	0	799	2025-10-24 00:47:13.651239	2025-10-24 00:47:13.651239
851	http://localhost:3000/uploads/2024/09/34612-01-1.png	imported/34612/0	t	0	800	2025-10-24 00:47:13.664606	2025-10-24 00:47:13.664606
852	http://localhost:3000/uploads/2024/09/34613-01.png	imported/34613/0	t	0	801	2025-10-24 00:47:13.678387	2025-10-24 00:47:13.678387
853	http://localhost:3000/uploads/2024/09/34614-01-1.png	imported/34614/0	t	0	802	2025-10-24 00:47:13.693244	2025-10-24 00:47:13.693244
854	http://localhost:3000/uploads/2024/09/34843-01.png	imported/34843/0	t	0	803	2025-10-24 00:47:13.707701	2025-10-24 00:47:13.707701
855	http://localhost:3000/uploads/2024/09/21218-01.png	imported/21218/0	t	0	804	2025-10-24 00:47:13.721661	2025-10-24 00:47:13.721661
856	http://localhost:3000/uploads/2024/09/21219-01.png	imported/21219/0	t	0	805	2025-10-24 00:47:13.735136	2025-10-24 00:47:13.735136
857	http://localhost:3000/uploads/2024/09/21222-01.png	imported/21222/0	t	0	806	2025-10-24 00:47:13.748626	2025-10-24 00:47:13.748626
858	http://localhost:3000/uploads/2024/09/21235-01.png	imported/21235/0	t	0	807	2025-10-24 00:47:13.762306	2025-10-24 00:47:13.762306
859	http://localhost:3000/uploads/2024/09/21242-01.png	imported/21242/0	t	0	808	2025-10-24 00:47:13.776426	2025-10-24 00:47:13.776426
860	http://localhost:3000/uploads/2024/09/22634-01.png	imported/22634/0	t	0	809	2025-10-24 00:47:13.789856	2025-10-24 00:47:13.789856
861	http://localhost:3000/uploads/2024/09/22668-01.png	imported/22668/0	t	0	810	2025-10-24 00:47:13.803028	2025-10-24 00:47:13.803028
862	http://localhost:3000/uploads/2024/09/23790-01.png	imported/23790/0	t	0	811	2025-10-24 00:47:13.818058	2025-10-24 00:47:13.818058
863	http://localhost:3000/uploads/2024/09/23797-01.png	imported/23797/0	t	0	812	2025-10-24 00:47:13.831543	2025-10-24 00:47:13.831543
864	http://localhost:3000/uploads/2024/09/23807-01.png	imported/23807/0	t	0	813	2025-10-24 00:47:13.844232	2025-10-24 00:47:13.844232
865	http://localhost:3000/uploads/2024/09/24938-01.png	imported/24938/0	t	0	814	2025-10-24 00:47:13.85745	2025-10-24 00:47:13.85745
866	http://localhost:3000/uploads/2024/09/25002-01.png	imported/25002/0	t	0	815	2025-10-24 00:47:13.87046	2025-10-24 00:47:13.87046
867	http://localhost:3000/uploads/2024/09/25491-01.png	imported/25491/0	t	0	816	2025-10-24 00:47:13.884792	2025-10-24 00:47:13.884792
868	http://localhost:3000/uploads/2024/09/28442-01.png	imported/28442/0	t	0	817	2025-10-24 00:47:13.899798	2025-10-24 00:47:13.899798
869	http://localhost:3000/uploads/2024/09/29785-01.png	imported/29785/0	t	0	818	2025-10-24 00:47:13.914381	2025-10-24 00:47:13.914381
870	http://localhost:3000/uploads/2024/09/29787-01.png	imported/29787/0	t	0	819	2025-10-24 00:47:13.92934	2025-10-24 00:47:13.92934
871	http://localhost:3000/uploads/2024/09/29823-01.png	imported/29823/0	t	0	820	2025-10-24 00:47:13.942545	2025-10-24 00:47:13.942545
872	http://localhost:3000/uploads/2024/09/29986-01.png	imported/29986/0	t	0	821	2025-10-24 00:47:13.957223	2025-10-24 00:47:13.957223
873	http://localhost:3000/uploads/2024/09/29989-01.png	imported/29989/0	t	0	822	2025-10-24 00:47:13.971682	2025-10-24 00:47:13.971682
874	http://localhost:3000/uploads/2024/09/30545-01.png	imported/30545/0	t	0	823	2025-10-24 00:47:13.98609	2025-10-24 00:47:13.98609
875	http://localhost:3000/uploads/2024/10/30569-01.png	imported/30569/0	t	0	824	2025-10-24 00:47:14.002614	2025-10-24 00:47:14.002614
876	http://localhost:3000/uploads/2024/10/31273-01.png	imported/31273/0	t	0	825	2025-10-24 00:47:14.035244	2025-10-24 00:47:14.035244
877	http://localhost:3000/uploads/2024/10/32554-01-1.png	imported/32554/0	t	0	826	2025-10-24 00:47:14.049397	2025-10-24 00:47:14.049397
878	http://localhost:3000/uploads/2024/10/34462-01.png	imported/34462/0	t	0	827	2025-10-24 00:47:14.064261	2025-10-24 00:47:14.064261
879	http://localhost:3000/uploads/2025/07/33646-01.jpg	imported/33646/0	t	0	828	2025-10-24 00:47:14.07866	2025-10-24 00:47:14.07866
880	http://localhost:3000/uploads/2025/07/20814-01.jpg	imported/20814/0	t	0	829	2025-10-24 00:47:14.09349	2025-10-24 00:47:14.09349
881	http://localhost:3000/uploads/2024/10/26105-01.png	imported/26105/0	t	0	830	2025-10-24 00:47:14.106536	2025-10-24 00:47:14.106536
882	http://localhost:3000/uploads/2024/09/28400-01.png	imported/28400/0	t	0	831	2025-10-24 00:47:14.119581	2025-10-24 00:47:14.119581
883	http://localhost:3000/uploads/2024/09/30520-01.png	imported/30520/0	t	0	832	2025-10-24 00:47:14.132673	2025-10-24 00:47:14.132673
884	http://localhost:3000/uploads/2024/09/30317-01.png	imported/30317/0	t	0	833	2025-10-24 00:47:14.145885	2025-10-24 00:47:14.145885
885	http://localhost:3000/uploads/2024/10/30364-01.png	imported/30364/0	t	0	834	2025-10-24 00:47:14.15989	2025-10-24 00:47:14.15989
886	http://localhost:3000/uploads/2024/09/30525-01.png	imported/30525/0	t	0	835	2025-10-24 00:47:14.173878	2025-10-24 00:47:14.173878
887	http://localhost:3000/uploads/2024/10/30537-01.png	imported/30537/0	t	0	836	2025-10-24 00:47:14.187856	2025-10-24 00:47:14.187856
888	http://localhost:3000/uploads/2024/09/30551-01.png	imported/30551/0	t	0	837	2025-10-24 00:47:14.202207	2025-10-24 00:47:14.202207
889	http://localhost:3000/uploads/2025/07/20760-01.jpg	imported/20760/0	t	0	839	2025-10-24 00:47:14.223337	2025-10-24 00:47:14.223337
890	http://localhost:3000/uploads/2024/09/30553-01.png	imported/30553/0	t	0	840	2025-10-24 00:47:14.236276	2025-10-24 00:47:14.236276
891	http://localhost:3000/uploads/2024/09/29755-01.png	imported/29755/0	t	0	841	2025-10-24 00:47:14.249183	2025-10-24 00:47:14.249183
892	http://localhost:3000/uploads/2024/09/30558-01.png	imported/30558/0	t	0	842	2025-10-24 00:47:14.262237	2025-10-24 00:47:14.262237
893	http://localhost:3000/uploads/2024/09/30566-01.png	imported/30566/0	t	0	843	2025-10-24 00:47:14.276318	2025-10-24 00:47:14.276318
894	http://localhost:3000/uploads/2024/09/30568-01.png	imported/30568/0	t	0	844	2025-10-24 00:47:14.289227	2025-10-24 00:47:14.289227
895	http://localhost:3000/uploads/2024/09/30572-01.png	imported/30572/0	t	0	845	2025-10-24 00:47:14.303616	2025-10-24 00:47:14.303616
896	http://localhost:3000/uploads/2024/09/30573-01.png	imported/30573/0	t	0	846	2025-10-24 00:47:14.318274	2025-10-24 00:47:14.318274
897	http://localhost:3000/uploads/2024/09/30580-01.png	imported/30580/0	t	0	847	2025-10-24 00:47:14.332683	2025-10-24 00:47:14.332683
898	http://localhost:3000/uploads/2024/09/30802-01.png	imported/30802/0	t	0	848	2025-10-24 00:47:14.345885	2025-10-24 00:47:14.345885
899	http://localhost:3000/uploads/2024/09/30944-01.png	imported/30944/0	t	0	849	2025-10-24 00:47:14.359062	2025-10-24 00:47:14.359062
900	http://localhost:3000/uploads/2024/09/31167-01.png	imported/31167/0	t	0	850	2025-10-24 00:47:14.373758	2025-10-24 00:47:14.373758
901	http://localhost:3000/uploads/2024/09/31180-01.png	imported/31180/0	t	0	851	2025-10-24 00:47:14.387524	2025-10-24 00:47:14.387524
902	http://localhost:3000/uploads/2024/09/20740-01.png	imported/20740/0	t	0	853	2025-10-24 00:47:14.408419	2025-10-24 00:47:14.408419
903	http://localhost:3000/uploads/2024/09/20821-01.png	imported/20821/0	t	0	854	2025-10-24 00:47:14.421634	2025-10-24 00:47:14.421634
904	http://localhost:3000/uploads/2024/09/20899-01.png	imported/20899/0	t	0	855	2025-10-24 00:47:14.452666	2025-10-24 00:47:14.452666
905	http://localhost:3000/uploads/2024/09/23269-01.png	imported/23269/0	t	0	856	2025-10-24 00:47:14.468821	2025-10-24 00:47:14.468821
906	http://localhost:3000/uploads/2024/09/23786-01.png	imported/23786/0	t	0	857	2025-10-24 00:47:14.482694	2025-10-24 00:47:14.482694
907	http://localhost:3000/uploads/2024/09/24148-01.png	imported/24148/0	t	0	858	2025-10-24 00:47:14.49736	2025-10-24 00:47:14.49736
908	http://localhost:3000/uploads/2024/09/25971-01.png	imported/25971/0	t	0	859	2025-10-24 00:47:14.512189	2025-10-24 00:47:14.512189
909	http://localhost:3000/uploads/2024/09/28133-01.png	imported/28133/0	t	0	860	2025-10-24 00:47:14.525937	2025-10-24 00:47:14.525937
910	http://localhost:3000/uploads/2024/09/28589-01.png	imported/28589/0	t	0	861	2025-10-24 00:47:14.539235	2025-10-24 00:47:14.539235
911	http://localhost:3000/uploads/2024/09/29299-01.png	imported/29299/0	t	0	862	2025-10-24 00:47:14.553453	2025-10-24 00:47:14.553453
912	http://localhost:3000/uploads/2024/09/29341-01.png	imported/29341/0	t	0	863	2025-10-24 00:47:14.567093	2025-10-24 00:47:14.567093
913	http://localhost:3000/uploads/2024/09/29993-01.png	imported/29993/0	t	0	864	2025-10-24 00:47:14.580196	2025-10-24 00:47:14.580196
914	http://localhost:3000/uploads/2024/09/29995-01.png	imported/29995/0	t	0	865	2025-10-24 00:47:14.593718	2025-10-24 00:47:14.593718
915	http://localhost:3000/uploads/2024/09/31327-01.png	imported/31327/0	t	0	866	2025-10-24 00:47:14.607432	2025-10-24 00:47:14.607432
916	http://localhost:3000/uploads/2024/09/34099-01.png	imported/34099/0	t	0	867	2025-10-24 00:47:14.622262	2025-10-24 00:47:14.622262
917	http://localhost:3000/uploads/2024/10/20956-01.png	imported/20956/0	t	0	868	2025-10-24 00:47:14.636053	2025-10-24 00:47:14.636053
918	http://localhost:3000/uploads/2024/10/26408-01.png	imported/26408/0	t	0	869	2025-10-24 00:47:14.649489	2025-10-24 00:47:14.649489
919	http://localhost:3000/uploads/2024/10/26409-01.png	imported/26409/0	t	0	870	2025-10-24 00:47:14.663738	2025-10-24 00:47:14.663738
920	http://localhost:3000/uploads/2024/10/30300-01.png	imported/30300/0	t	0	871	2025-10-24 00:47:14.678193	2025-10-24 00:47:14.678193
921	http://localhost:3000/uploads/2024/10/30305-01.png	imported/30305/0	t	0	872	2025-10-24 00:47:14.692397	2025-10-24 00:47:14.692397
922	http://localhost:3000/uploads/2024/10/30322-01.png	imported/30322/0	t	0	873	2025-10-24 00:47:14.706601	2025-10-24 00:47:14.706601
923	http://localhost:3000/uploads/2024/10/30484-01.png	imported/30484/0	t	0	874	2025-10-24 00:47:14.720291	2025-10-24 00:47:14.720291
924	http://localhost:3000/uploads/2024/10/30485-01.png	imported/30485/0	t	0	875	2025-10-24 00:47:14.732537	2025-10-24 00:47:14.732537
925	http://localhost:3000/uploads/2024/10/30487-01.png	imported/30487/0	t	0	876	2025-10-24 00:47:14.744782	2025-10-24 00:47:14.744782
926	http://localhost:3000/uploads/2024/10/30532-01.png	imported/30532/0	t	0	877	2025-10-24 00:47:14.757829	2025-10-24 00:47:14.757829
927	http://localhost:3000/uploads/2024/10/30543-01.png	imported/30543/0	t	0	878	2025-10-24 00:47:14.771006	2025-10-24 00:47:14.771006
928	http://localhost:3000/uploads/2024/10/30805-01.png	imported/30805/0	t	0	879	2025-10-24 00:47:14.785851	2025-10-24 00:47:14.785851
929	http://localhost:3000/uploads/2024/10/30811-01.png	imported/30811/0	t	0	880	2025-10-24 00:47:14.799062	2025-10-24 00:47:14.799062
930	http://localhost:3000/uploads/2024/10/30812-01.png	imported/30812/0	t	0	881	2025-10-24 00:47:14.811778	2025-10-24 00:47:14.811778
931	http://localhost:3000/uploads/2025/07/30812-02.jpg	imported/30812/1	f	1	881	2025-10-24 00:47:14.814543	2025-10-24 00:47:14.814543
932	http://localhost:3000/uploads/2024/10/30817-01.png	imported/30817/0	t	0	882	2025-10-24 00:47:14.827291	2025-10-24 00:47:14.827291
933	http://localhost:3000/uploads/2024/10/30818-01.png	imported/30818/0	t	0	883	2025-10-24 00:47:14.839342	2025-10-24 00:47:14.839342
934	http://localhost:3000/uploads/2024/10/30819-01.png	imported/30819/0	t	0	884	2025-10-24 00:47:14.854053	2025-10-24 00:47:14.854053
935	http://localhost:3000/uploads/2024/10/30903-01.png	imported/30903/0	t	0	885	2025-10-24 00:47:14.866665	2025-10-24 00:47:14.866665
936	http://localhost:3000/uploads/2024/10/30909-01.png	imported/30909/0	t	0	886	2025-10-24 00:47:14.89779	2025-10-24 00:47:14.89779
937	http://localhost:3000/uploads/2024/10/30910-01.png	imported/30910/0	t	0	887	2025-10-24 00:47:14.912731	2025-10-24 00:47:14.912731
938	http://localhost:3000/uploads/2024/10/30914-01.png	imported/30914/0	t	0	888	2025-10-24 00:47:14.927563	2025-10-24 00:47:14.927563
939	http://localhost:3000/uploads/2024/10/30920-01.png	imported/30920/0	t	0	889	2025-10-24 00:47:14.94295	2025-10-24 00:47:14.94295
940	http://localhost:3000/uploads/2024/10/30931-01.png	imported/30931/0	t	0	890	2025-10-24 00:47:14.956199	2025-10-24 00:47:14.956199
941	http://localhost:3000/uploads/2024/10/30945-01.png	imported/30945/0	t	0	891	2025-10-24 00:47:14.968904	2025-10-24 00:47:14.968904
942	http://localhost:3000/uploads/2025/07/30951-01.png	imported/30951/0	t	0	892	2025-10-24 00:47:14.981046	2025-10-24 00:47:14.981046
943	http://localhost:3000/uploads/2024/10/30955-01.png	imported/30955/0	t	0	893	2025-10-24 00:47:14.993063	2025-10-24 00:47:14.993063
944	http://localhost:3000/uploads/2024/10/30956-01.png	imported/30956/0	t	0	894	2025-10-24 00:47:15.00737	2025-10-24 00:47:15.00737
945	http://localhost:3000/uploads/2024/10/35529-01.png	imported/35529/0	t	0	895	2025-10-24 00:47:15.021645	2025-10-24 00:47:15.021645
946	http://localhost:3000/uploads/2024/10/30325-01.png	imported/30325/0	t	0	896	2025-10-24 00:47:15.036682	2025-10-24 00:47:15.036682
947	http://localhost:3000/uploads/2024/10/30316-01.png	imported/30316/0	t	0	897	2025-10-24 00:47:15.049779	2025-10-24 00:47:15.049779
948	http://localhost:3000/uploads/2024/10/30561-01.png	imported/30561/0	t	0	900	2025-10-24 00:47:15.076555	2025-10-24 00:47:15.076555
949	http://localhost:3000/uploads/2025/05/22611-01.jpg	imported/22611/0	t	0	901	2025-10-24 00:47:15.089471	2025-10-24 00:47:15.089471
950	http://localhost:3000/uploads/2025/05/22611-02.jpg	imported/22611/1	f	1	901	2025-10-24 00:47:15.092781	2025-10-24 00:47:15.092781
951	http://localhost:3000/uploads/2025/05/22611-03.jpg	imported/22611/2	f	2	901	2025-10-24 00:47:15.095993	2025-10-24 00:47:15.095993
952	http://localhost:3000/uploads/2025/05/22611-04.jpg	imported/22611/3	f	3	901	2025-10-24 00:47:15.0991	2025-10-24 00:47:15.0991
953	http://localhost:3000/uploads/2025/05/22809-01.jpg	imported/22809/0	t	0	902	2025-10-24 00:47:15.113013	2025-10-24 00:47:15.113013
954	http://localhost:3000/uploads/2025/05/22809-02.jpg	imported/22809/1	f	1	902	2025-10-24 00:47:15.115973	2025-10-24 00:47:15.115973
955	http://localhost:3000/uploads/2025/05/22809-03.jpg	imported/22809/2	f	2	902	2025-10-24 00:47:15.118846	2025-10-24 00:47:15.118846
956	http://localhost:3000/uploads/2025/05/22809-04.jpg	imported/22809/3	f	3	902	2025-10-24 00:47:15.121512	2025-10-24 00:47:15.121512
957	http://localhost:3000/uploads/2025/05/23254-01.jpg	imported/23254/0	t	0	903	2025-10-24 00:47:15.134142	2025-10-24 00:47:15.134142
958	http://localhost:3000/uploads/2025/05/23254-02.jpg	imported/23254/1	f	1	903	2025-10-24 00:47:15.136954	2025-10-24 00:47:15.136954
959	http://localhost:3000/uploads/2025/05/23254-03.jpg	imported/23254/2	f	2	903	2025-10-24 00:47:15.139599	2025-10-24 00:47:15.139599
960	http://localhost:3000/uploads/2025/05/23254-04.jpg	imported/23254/3	f	3	903	2025-10-24 00:47:15.142279	2025-10-24 00:47:15.142279
961	http://localhost:3000/uploads/2025/05/23280-01.jpg	imported/23280/0	t	0	904	2025-10-24 00:47:15.155135	2025-10-24 00:47:15.155135
962	http://localhost:3000/uploads/2025/05/23280-02.jpg	imported/23280/1	f	1	904	2025-10-24 00:47:15.158199	2025-10-24 00:47:15.158199
963	http://localhost:3000/uploads/2025/05/23280-03.jpg	imported/23280/2	f	2	904	2025-10-24 00:47:15.161049	2025-10-24 00:47:15.161049
964	http://localhost:3000/uploads/2025/05/23280-04.jpg	imported/23280/3	f	3	904	2025-10-24 00:47:15.163887	2025-10-24 00:47:15.163887
965	http://localhost:3000/uploads/2025/05/23296-01.jpg	imported/23296/0	t	0	905	2025-10-24 00:47:15.175903	2025-10-24 00:47:15.175903
966	http://localhost:3000/uploads/2025/05/23296-02.jpg	imported/23296/1	f	1	905	2025-10-24 00:47:15.178575	2025-10-24 00:47:15.178575
967	http://localhost:3000/uploads/2025/05/23296-03.jpg	imported/23296/2	f	2	905	2025-10-24 00:47:15.181134	2025-10-24 00:47:15.181134
968	http://localhost:3000/uploads/2025/05/23296-04.jpg	imported/23296/3	f	3	905	2025-10-24 00:47:15.183675	2025-10-24 00:47:15.183675
969	http://localhost:3000/uploads/2025/05/24281-01.jpg	imported/24281/0	t	0	906	2025-10-24 00:47:15.195537	2025-10-24 00:47:15.195537
970	http://localhost:3000/uploads/2025/05/24281-02.jpg	imported/24281/1	f	1	906	2025-10-24 00:47:15.198259	2025-10-24 00:47:15.198259
971	http://localhost:3000/uploads/2025/05/24281-03.jpg	imported/24281/2	f	2	906	2025-10-24 00:47:15.200762	2025-10-24 00:47:15.200762
972	http://localhost:3000/uploads/2025/05/24281-04.jpg	imported/24281/3	f	3	906	2025-10-24 00:47:15.203254	2025-10-24 00:47:15.203254
973	http://localhost:3000/uploads/2025/05/24365-01.jpg	imported/24365/0	t	0	907	2025-10-24 00:47:15.215183	2025-10-24 00:47:15.215183
974	http://localhost:3000/uploads/2025/05/24365-02.jpg	imported/24365/1	f	1	907	2025-10-24 00:47:15.217969	2025-10-24 00:47:15.217969
975	http://localhost:3000/uploads/2025/05/24365-03.jpg	imported/24365/2	f	2	907	2025-10-24 00:47:15.220728	2025-10-24 00:47:15.220728
976	http://localhost:3000/uploads/2025/05/24365-04.jpg	imported/24365/3	f	3	907	2025-10-24 00:47:15.223258	2025-10-24 00:47:15.223258
977	http://localhost:3000/uploads/2025/05/24609-01.jpg	imported/24609/0	t	0	908	2025-10-24 00:47:15.235632	2025-10-24 00:47:15.235632
978	http://localhost:3000/uploads/2025/05/24609-02.jpg	imported/24609/1	f	1	908	2025-10-24 00:47:15.256673	2025-10-24 00:47:15.256673
979	http://localhost:3000/uploads/2025/05/24609-03.jpg	imported/24609/2	f	2	908	2025-10-24 00:47:15.259984	2025-10-24 00:47:15.259984
980	http://localhost:3000/uploads/2025/05/24609-04.jpg	imported/24609/3	f	3	908	2025-10-24 00:47:15.262884	2025-10-24 00:47:15.262884
981	http://localhost:3000/uploads/2025/05/25605-01.jpg	imported/25605/0	t	0	909	2025-10-24 00:47:15.27884	2025-10-24 00:47:15.27884
982	http://localhost:3000/uploads/2025/05/25605-02.jpg	imported/25605/1	f	1	909	2025-10-24 00:47:15.282121	2025-10-24 00:47:15.282121
983	http://localhost:3000/uploads/2025/05/25605-03.jpg	imported/25605/2	f	2	909	2025-10-24 00:47:15.28563	2025-10-24 00:47:15.28563
984	http://localhost:3000/uploads/2025/05/25605-04.jpg	imported/25605/3	f	3	909	2025-10-24 00:47:15.288748	2025-10-24 00:47:15.288748
985	http://localhost:3000/uploads/2025/05/26598-01.jpg	imported/26598/0	t	0	910	2025-10-24 00:47:15.304147	2025-10-24 00:47:15.304147
986	http://localhost:3000/uploads/2025/05/26598-02.jpg	imported/26598/1	f	1	910	2025-10-24 00:47:15.313746	2025-10-24 00:47:15.313746
987	http://localhost:3000/uploads/2025/05/26598-03.jpg	imported/26598/2	f	2	910	2025-10-24 00:47:15.317532	2025-10-24 00:47:15.317532
988	http://localhost:3000/uploads/2025/05/26598-04.jpg	imported/26598/3	f	3	910	2025-10-24 00:47:15.321407	2025-10-24 00:47:15.321407
989	http://localhost:3000/uploads/2025/05/28008-01.jpg	imported/28008/0	t	0	912	2025-10-24 00:47:15.343283	2025-10-24 00:47:15.343283
990	http://localhost:3000/uploads/2025/05/28008-02.jpg	imported/28008/1	f	1	912	2025-10-24 00:47:15.346911	2025-10-24 00:47:15.346911
991	http://localhost:3000/uploads/2025/05/28008-03.jpg	imported/28008/2	f	2	912	2025-10-24 00:47:15.350314	2025-10-24 00:47:15.350314
992	http://localhost:3000/uploads/2025/05/28008-04.jpg	imported/28008/3	f	3	912	2025-10-24 00:47:15.355251	2025-10-24 00:47:15.355251
993	http://localhost:3000/uploads/2025/05/28469-01.jpg	imported/28469/0	t	0	913	2025-10-24 00:47:15.368552	2025-10-24 00:47:15.368552
994	http://localhost:3000/uploads/2025/05/28469-02.jpg	imported/28469/1	f	1	913	2025-10-24 00:47:15.371378	2025-10-24 00:47:15.371378
995	http://localhost:3000/uploads/2025/05/28469-03.jpg	imported/28469/2	f	2	913	2025-10-24 00:47:15.374214	2025-10-24 00:47:15.374214
996	http://localhost:3000/uploads/2025/05/28469-04.jpg	imported/28469/3	f	3	913	2025-10-24 00:47:15.376915	2025-10-24 00:47:15.376915
997	http://localhost:3000/uploads/2025/05/28470-01.jpg	imported/28470/0	t	0	914	2025-10-24 00:47:15.389803	2025-10-24 00:47:15.389803
998	http://localhost:3000/uploads/2025/05/28470-02.jpg	imported/28470/1	f	1	914	2025-10-24 00:47:15.392665	2025-10-24 00:47:15.392665
999	http://localhost:3000/uploads/2025/05/28470-03.jpg	imported/28470/2	f	2	914	2025-10-24 00:47:15.395315	2025-10-24 00:47:15.395315
1000	http://localhost:3000/uploads/2025/05/28470-04.jpg	imported/28470/3	f	3	914	2025-10-24 00:47:15.398053	2025-10-24 00:47:15.398053
1001	http://localhost:3000/uploads/2025/05/28471-01.jpg	imported/28471/0	t	0	915	2025-10-24 00:47:15.41113	2025-10-24 00:47:15.41113
1002	http://localhost:3000/uploads/2025/05/28471-02.jpg	imported/28471/1	f	1	915	2025-10-24 00:47:15.414136	2025-10-24 00:47:15.414136
1003	http://localhost:3000/uploads/2025/05/28471-03.jpg	imported/28471/2	f	2	915	2025-10-24 00:47:15.417086	2025-10-24 00:47:15.417086
1004	http://localhost:3000/uploads/2025/05/28471-04.jpg	imported/28471/3	f	3	915	2025-10-24 00:47:15.420084	2025-10-24 00:47:15.420084
1005	http://localhost:3000/uploads/2025/05/28473-01.jpg	imported/28473/0	t	0	916	2025-10-24 00:47:15.433604	2025-10-24 00:47:15.433604
1006	http://localhost:3000/uploads/2025/05/28473-02.jpg	imported/28473/1	f	1	916	2025-10-24 00:47:15.436592	2025-10-24 00:47:15.436592
1007	http://localhost:3000/uploads/2025/05/28475-01.jpg	imported/28475/0	t	0	917	2025-10-24 00:47:15.44951	2025-10-24 00:47:15.44951
1008	http://localhost:3000/uploads/2025/05/28475-02.jpg	imported/28475/1	f	1	917	2025-10-24 00:47:15.452351	2025-10-24 00:47:15.452351
1009	http://localhost:3000/uploads/2025/05/28475-03.jpg	imported/28475/2	f	2	917	2025-10-24 00:47:15.455209	2025-10-24 00:47:15.455209
1010	http://localhost:3000/uploads/2025/05/28475-04.jpg	imported/28475/3	f	3	917	2025-10-24 00:47:15.458281	2025-10-24 00:47:15.458281
1011	http://localhost:3000/uploads/2025/05/29155-01.jpg	imported/29155/0	t	0	918	2025-10-24 00:47:15.472214	2025-10-24 00:47:15.472214
1012	http://localhost:3000/uploads/2025/05/29155-02.jpg	imported/29155/1	f	1	918	2025-10-24 00:47:15.475546	2025-10-24 00:47:15.475546
1013	http://localhost:3000/uploads/2025/05/29155-03.jpg	imported/29155/2	f	2	918	2025-10-24 00:47:15.478745	2025-10-24 00:47:15.478745
1014	http://localhost:3000/uploads/2025/05/29155-04.jpg	imported/29155/3	f	3	918	2025-10-24 00:47:15.48188	2025-10-24 00:47:15.48188
1015	http://localhost:3000/uploads/2025/05/31334-01.jpg	imported/31334/0	t	0	919	2025-10-24 00:47:15.496396	2025-10-24 00:47:15.496396
1016	http://localhost:3000/uploads/2025/05/31334-02.jpg	imported/31334/1	f	1	919	2025-10-24 00:47:15.499948	2025-10-24 00:47:15.499948
1017	http://localhost:3000/uploads/2025/05/31334-03.jpg	imported/31334/2	f	2	919	2025-10-24 00:47:15.50332	2025-10-24 00:47:15.50332
1018	http://localhost:3000/uploads/2025/05/31334-04.jpg	imported/31334/3	f	3	919	2025-10-24 00:47:15.506352	2025-10-24 00:47:15.506352
1019	http://localhost:3000/uploads/2025/05/31698-01.jpg	imported/31698/0	t	0	920	2025-10-24 00:47:15.520089	2025-10-24 00:47:15.520089
1020	http://localhost:3000/uploads/2025/05/31698-02.jpg	imported/31698/1	f	1	920	2025-10-24 00:47:15.523221	2025-10-24 00:47:15.523221
1021	http://localhost:3000/uploads/2025/05/31698-03.jpg	imported/31698/2	f	2	920	2025-10-24 00:47:15.526306	2025-10-24 00:47:15.526306
1022	http://localhost:3000/uploads/2025/05/31698-04.jpg	imported/31698/3	f	3	920	2025-10-24 00:47:15.529538	2025-10-24 00:47:15.529538
1023	http://localhost:3000/uploads/2025/05/32600-01.jpg	imported/32600/0	t	0	921	2025-10-24 00:47:15.54334	2025-10-24 00:47:15.54334
1024	http://localhost:3000/uploads/2025/05/32600-02.jpg	imported/32600/1	f	1	921	2025-10-24 00:47:15.546842	2025-10-24 00:47:15.546842
1025	http://localhost:3000/uploads/2025/05/32600-03.jpg	imported/32600/2	f	2	921	2025-10-24 00:47:15.550119	2025-10-24 00:47:15.550119
1026	http://localhost:3000/uploads/2025/05/32600-04.jpg	imported/32600/3	f	3	921	2025-10-24 00:47:15.553354	2025-10-24 00:47:15.553354
1027	http://localhost:3000/uploads/2025/05/33188-01.jpg	imported/33188/0	t	0	922	2025-10-24 00:47:15.568252	2025-10-24 00:47:15.568252
1028	http://localhost:3000/uploads/2025/05/33188-02.jpg	imported/33188/1	f	1	922	2025-10-24 00:47:15.589793	2025-10-24 00:47:15.589793
1029	http://localhost:3000/uploads/2025/05/33188-03.jpg	imported/33188/2	f	2	922	2025-10-24 00:47:15.593467	2025-10-24 00:47:15.593467
1030	http://localhost:3000/uploads/2025/05/33188-04.jpg	imported/33188/3	f	3	922	2025-10-24 00:47:15.596686	2025-10-24 00:47:15.596686
1031	http://localhost:3000/uploads/2025/05/34730-01.jpg	imported/34730/0	t	0	923	2025-10-24 00:47:15.609855	2025-10-24 00:47:15.609855
1032	http://localhost:3000/uploads/2025/05/34730-02.jpg	imported/34730/1	f	1	923	2025-10-24 00:47:15.612918	2025-10-24 00:47:15.612918
1033	http://localhost:3000/uploads/2025/05/34730-03.jpg	imported/34730/2	f	2	923	2025-10-24 00:47:15.615834	2025-10-24 00:47:15.615834
1034	http://localhost:3000/uploads/2025/05/34730-04.jpg	imported/34730/3	f	3	923	2025-10-24 00:47:15.618534	2025-10-24 00:47:15.618534
1035	http://localhost:3000/uploads/2025/05/34735-01.jpg	imported/34735/0	t	0	924	2025-10-24 00:47:15.631177	2025-10-24 00:47:15.631177
1036	http://localhost:3000/uploads/2025/05/34735-02.jpg	imported/34735/1	f	1	924	2025-10-24 00:47:15.634175	2025-10-24 00:47:15.634175
1037	http://localhost:3000/uploads/2025/05/34735-03.jpg	imported/34735/2	f	2	924	2025-10-24 00:47:15.636911	2025-10-24 00:47:15.636911
1038	http://localhost:3000/uploads/2025/05/34735-04.jpg	imported/34735/3	f	3	924	2025-10-24 00:47:15.639532	2025-10-24 00:47:15.639532
1039	http://localhost:3000/uploads/2025/05/34736-01.jpg	imported/34736/0	t	0	925	2025-10-24 00:47:15.653443	2025-10-24 00:47:15.653443
1040	http://localhost:3000/uploads/2025/05/34736-02.jpg	imported/34736/1	f	1	925	2025-10-24 00:47:15.656532	2025-10-24 00:47:15.656532
1041	http://localhost:3000/uploads/2025/05/34736-03.jpg	imported/34736/2	f	2	925	2025-10-24 00:47:15.659425	2025-10-24 00:47:15.659425
1042	http://localhost:3000/uploads/2025/05/34736-04.jpg	imported/34736/3	f	3	925	2025-10-24 00:47:15.662394	2025-10-24 00:47:15.662394
1043	http://localhost:3000/uploads/2025/05/22292-01.jpg	imported/22292/0	t	0	926	2025-10-24 00:47:15.675746	2025-10-24 00:47:15.675746
1044	http://localhost:3000/uploads/2025/05/22292-02.png	imported/22292/1	f	1	926	2025-10-24 00:47:15.678912	2025-10-24 00:47:15.678912
1045	http://localhost:3000/uploads/2025/05/22292-03.jpg	imported/22292/2	f	2	926	2025-10-24 00:47:15.681918	2025-10-24 00:47:15.681918
1046	http://localhost:3000/uploads/2025/05/22294-01.jpg	imported/22294/0	t	0	927	2025-10-24 00:47:15.695353	2025-10-24 00:47:15.695353
1047	http://localhost:3000/uploads/2025/05/22294-02.jpg	imported/22294/1	f	1	927	2025-10-24 00:47:15.698524	2025-10-24 00:47:15.698524
1048	http://localhost:3000/uploads/2025/05/22295-01.jpg	imported/22295/0	t	0	928	2025-10-24 00:47:15.711614	2025-10-24 00:47:15.711614
1049	http://localhost:3000/uploads/2025/05/22295-02.jpg	imported/22295/1	f	1	928	2025-10-24 00:47:15.714774	2025-10-24 00:47:15.714774
1050	http://localhost:3000/uploads/2025/05/22300-01.jpg	imported/22300/0	t	0	929	2025-10-24 00:47:15.727142	2025-10-24 00:47:15.727142
1051	http://localhost:3000/uploads/2025/05/22300-02.jpg	imported/22300/1	f	1	929	2025-10-24 00:47:15.729924	2025-10-24 00:47:15.729924
1052	http://localhost:3000/uploads/2025/05/22321-01.jpg	imported/22321/0	t	0	930	2025-10-24 00:47:15.742157	2025-10-24 00:47:15.742157
1053	http://localhost:3000/uploads/2025/05/22321-02.png	imported/22321/1	f	1	930	2025-10-24 00:47:15.744885	2025-10-24 00:47:15.744885
1054	http://localhost:3000/uploads/2025/05/22909-01.jpg	imported/22909/0	t	0	931	2025-10-24 00:47:15.758237	2025-10-24 00:47:15.758237
1055	http://localhost:3000/uploads/2025/05/22909-02.png	imported/22909/1	f	1	931	2025-10-24 00:47:15.761376	2025-10-24 00:47:15.761376
1056	http://localhost:3000/uploads/2025/05/22909-03.jpg	imported/22909/2	f	2	931	2025-10-24 00:47:15.764522	2025-10-24 00:47:15.764522
1057	http://localhost:3000/uploads/2025/05/33758-01.jpg	imported/33758/0	t	0	932	2025-10-24 00:47:15.780229	2025-10-24 00:47:15.780229
1058	http://localhost:3000/uploads/2025/05/33758-02.jpg	imported/33758/1	f	1	932	2025-10-24 00:47:15.784181	2025-10-24 00:47:15.784181
1059	http://localhost:3000/uploads/2025/05/22905-01.jpg	imported/22905/0	t	0	933	2025-10-24 00:47:15.79868	2025-10-24 00:47:15.79868
1060	http://localhost:3000/uploads/2025/05/22905-02.png	imported/22905/1	f	1	933	2025-10-24 00:47:15.801781	2025-10-24 00:47:15.801781
1061	http://localhost:3000/uploads/2025/05/24234-01.jpg	imported/24234/0	t	0	934	2025-10-24 00:47:15.815096	2025-10-24 00:47:15.815096
1062	http://localhost:3000/uploads/2025/05/24234-02.png	imported/24234/1	f	1	934	2025-10-24 00:47:15.818624	2025-10-24 00:47:15.818624
1063	http://localhost:3000/uploads/2025/05/26044-01.jpg	imported/26044/0	t	0	936	2025-10-24 00:47:15.841219	2025-10-24 00:47:15.841219
1064	http://localhost:3000/uploads/2025/05/26044-02.png	imported/26044/1	f	1	936	2025-10-24 00:47:15.844752	2025-10-24 00:47:15.844752
1065	http://localhost:3000/uploads/2025/05/26054-01.jpg	imported/26054/0	t	0	937	2025-10-24 00:47:15.860442	2025-10-24 00:47:15.860442
1066	http://localhost:3000/uploads/2025/05/26054-02.png	imported/26054/1	f	1	937	2025-10-24 00:47:15.863547	2025-10-24 00:47:15.863547
1067	http://localhost:3000/uploads/2025/05/26731-01.jpg	imported/26731/0	t	0	938	2025-10-24 00:47:15.87813	2025-10-24 00:47:15.87813
1068	http://localhost:3000/uploads/2025/05/26731-02.png	imported/26731/1	f	1	938	2025-10-24 00:47:15.881611	2025-10-24 00:47:15.881611
1069	http://localhost:3000/uploads/2025/05/31528-01.png	imported/31528/0	t	0	939	2025-10-24 00:47:15.897214	2025-10-24 00:47:15.897214
1070	http://localhost:3000/uploads/2025/05/31528-02.png	imported/31528/1	f	1	939	2025-10-24 00:47:15.900663	2025-10-24 00:47:15.900663
1071	http://localhost:3000/uploads/2025/05/22385-01-1.jpg	imported/22385/0	t	0	940	2025-10-24 00:47:15.915534	2025-10-24 00:47:15.915534
1072	http://localhost:3000/uploads/2025/05/22385-02-1.png	imported/22385/1	f	1	940	2025-10-24 00:47:15.9185	2025-10-24 00:47:15.9185
1073	http://localhost:3000/uploads/2025/05/32902-01.jpg	imported/32902/0	t	0	941	2025-10-24 00:47:15.950216	2025-10-24 00:47:15.950216
1074	http://localhost:3000/uploads/2025/05/32902-02.png	imported/32902/1	f	1	941	2025-10-24 00:47:15.953125	2025-10-24 00:47:15.953125
1075	http://localhost:3000/uploads/2025/05/22817-01.jpg	imported/22817/0	t	0	942	2025-10-24 00:47:15.966868	2025-10-24 00:47:15.966868
1076	http://localhost:3000/uploads/2025/05/22817-02.jpg	imported/22817/1	f	1	942	2025-10-24 00:47:15.970308	2025-10-24 00:47:15.970308
1077	http://localhost:3000/uploads/2025/05/22955-01.jpg	imported/22955/0	t	0	943	2025-10-24 00:47:15.984611	2025-10-24 00:47:15.984611
1078	http://localhost:3000/uploads/2025/05/22955-02.jpg	imported/22955/1	f	1	943	2025-10-24 00:47:15.988023	2025-10-24 00:47:15.988023
1079	http://localhost:3000/uploads/2025/05/23377-01.jpg	imported/23377/0	t	0	944	2025-10-24 00:47:16.001277	2025-10-24 00:47:16.001277
1080	http://localhost:3000/uploads/2025/05/23377-02.jpg	imported/23377/1	f	1	944	2025-10-24 00:47:16.004195	2025-10-24 00:47:16.004195
1081	http://localhost:3000/uploads/2025/05/23378-01.jpg	imported/23378/0	t	0	945	2025-10-24 00:47:16.016992	2025-10-24 00:47:16.016992
1082	http://localhost:3000/uploads/2025/05/23378-02.jpg	imported/23378/1	f	1	945	2025-10-24 00:47:16.019798	2025-10-24 00:47:16.019798
1083	http://localhost:3000/uploads/2025/05/24499-01.jpg	imported/24499/0	t	0	946	2025-10-24 00:47:16.03247	2025-10-24 00:47:16.03247
1084	http://localhost:3000/uploads/2025/05/24499-02.jpg	imported/24499/1	f	1	946	2025-10-24 00:47:16.035334	2025-10-24 00:47:16.035334
1085	http://localhost:3000/uploads/2025/05/24916-01.jpg	imported/24916/0	t	0	947	2025-10-24 00:47:16.048628	2025-10-24 00:47:16.048628
1086	http://localhost:3000/uploads/2025/05/24916-02.jpg	imported/24916/1	f	1	947	2025-10-24 00:47:16.051622	2025-10-24 00:47:16.051622
1087	http://localhost:3000/uploads/2025/05/25221-01.jpg	imported/25221/0	t	0	948	2025-10-24 00:47:16.064372	2025-10-24 00:47:16.064372
1088	http://localhost:3000/uploads/2025/05/25221-02.jpg	imported/25221/1	f	1	948	2025-10-24 00:47:16.067338	2025-10-24 00:47:16.067338
1089	http://localhost:3000/uploads/2025/05/26136-01.jpg	imported/26136/0	t	0	949	2025-10-24 00:47:16.081365	2025-10-24 00:47:16.081365
1090	http://localhost:3000/uploads/2025/05/26136-02.jpg	imported/26136/1	f	1	949	2025-10-24 00:47:16.084738	2025-10-24 00:47:16.084738
1091	http://localhost:3000/uploads/2025/05/27935-01.jpg	imported/27935/0	t	0	950	2025-10-24 00:47:16.099293	2025-10-24 00:47:16.099293
1092	http://localhost:3000/uploads/2025/05/27935-02.jpg	imported/27935/1	f	1	950	2025-10-24 00:47:16.102757	2025-10-24 00:47:16.102757
1093	http://localhost:3000/uploads/2025/05/28012-01.jpg	imported/28012/0	t	0	951	2025-10-24 00:47:16.118355	2025-10-24 00:47:16.118355
1094	http://localhost:3000/uploads/2025/05/28012-02.jpg	imported/28012/1	f	1	951	2025-10-24 00:47:16.121407	2025-10-24 00:47:16.121407
1095	http://localhost:3000/uploads/2025/05/28080-01.jpg	imported/28080/0	t	0	952	2025-10-24 00:47:16.13491	2025-10-24 00:47:16.13491
1096	http://localhost:3000/uploads/2025/05/28080-02.jpg	imported/28080/1	f	1	952	2025-10-24 00:47:16.137845	2025-10-24 00:47:16.137845
1097	http://localhost:3000/uploads/2025/05/30192-01.jpg	imported/30192/0	t	0	953	2025-10-24 00:47:16.152159	2025-10-24 00:47:16.152159
1098	http://localhost:3000/uploads/2025/05/30192-02.jpg	imported/30192/1	f	1	953	2025-10-24 00:47:16.15541	2025-10-24 00:47:16.15541
1099	http://localhost:3000/uploads/2025/05/34071-01.jpg	imported/34071/0	t	0	954	2025-10-24 00:47:16.168424	2025-10-24 00:47:16.168424
1100	http://localhost:3000/uploads/2025/05/34071-02.jpg	imported/34071/1	f	1	954	2025-10-24 00:47:16.17147	2025-10-24 00:47:16.17147
1101	http://localhost:3000/uploads/2025/05/20101-01.jpg	imported/20101/0	t	0	955	2025-10-24 00:47:16.18513	2025-10-24 00:47:16.18513
1102	http://localhost:3000/uploads/2025/05/20101-02.jpg	imported/20101/1	f	1	955	2025-10-24 00:47:16.18818	2025-10-24 00:47:16.18818
1103	http://localhost:3000/uploads/2025/05/11046-01.jpg	imported/11046/0	t	0	956	2025-10-24 00:47:16.201212	2025-10-24 00:47:16.201212
1104	http://localhost:3000/uploads/2025/05/11046-02.jpg	imported/11046/1	f	1	956	2025-10-24 00:47:16.204738	2025-10-24 00:47:16.204738
1105	http://localhost:3000/uploads/2025/05/11046-03.jpg	imported/11046/2	f	2	956	2025-10-24 00:47:16.208297	2025-10-24 00:47:16.208297
1106	http://localhost:3000/uploads/2025/05/21118-01.jpg	imported/21118/0	t	0	957	2025-10-24 00:47:16.222322	2025-10-24 00:47:16.222322
1107	http://localhost:3000/uploads/2025/05/21118-02.jpg	imported/21118/1	f	1	957	2025-10-24 00:47:16.225712	2025-10-24 00:47:16.225712
1108	http://localhost:3000/uploads/2025/05/21118-03.jpg	imported/21118/2	f	2	957	2025-10-24 00:47:16.228826	2025-10-24 00:47:16.228826
1109	http://localhost:3000/uploads/2025/05/23392-01.jpg	imported/23392/0	t	0	958	2025-10-24 00:47:16.24246	2025-10-24 00:47:16.24246
1110	http://localhost:3000/uploads/2025/05/23392-02.jpg	imported/23392/1	f	1	958	2025-10-24 00:47:16.24563	2025-10-24 00:47:16.24563
1111	http://localhost:3000/uploads/2025/05/23392-03.jpg	imported/23392/2	f	2	958	2025-10-24 00:47:16.248602	2025-10-24 00:47:16.248602
1112	http://localhost:3000/uploads/2025/05/24272-01.jpg	imported/24272/0	t	0	959	2025-10-24 00:47:16.262691	2025-10-24 00:47:16.262691
1113	http://localhost:3000/uploads/2025/05/24272-02.jpg	imported/24272/1	f	1	959	2025-10-24 00:47:16.26574	2025-10-24 00:47:16.26574
1114	http://localhost:3000/uploads/2025/05/24272-03.jpg	imported/24272/2	f	2	959	2025-10-24 00:47:16.269047	2025-10-24 00:47:16.269047
1115	http://localhost:3000/uploads/2025/05/24272-04.jpg	imported/24272/3	f	3	959	2025-10-24 00:47:16.272051	2025-10-24 00:47:16.272051
1116	http://localhost:3000/uploads/2025/05/24272-05.jpg	imported/24272/4	f	4	959	2025-10-24 00:47:16.274997	2025-10-24 00:47:16.274997
1117	http://localhost:3000/uploads/2025/05/24272-06.jpg	imported/24272/5	f	5	959	2025-10-24 00:47:16.278006	2025-10-24 00:47:16.278006
1118	http://localhost:3000/uploads/2025/05/25068-01.jpg	imported/25068/0	t	0	960	2025-10-24 00:47:16.307868	2025-10-24 00:47:16.307868
1119	http://localhost:3000/uploads/2025/05/25068-02.jpg	imported/25068/1	f	1	960	2025-10-24 00:47:16.311261	2025-10-24 00:47:16.311261
1120	http://localhost:3000/uploads/2025/05/25068-03.jpg	imported/25068/2	f	2	960	2025-10-24 00:47:16.314425	2025-10-24 00:47:16.314425
1121	http://localhost:3000/uploads/2025/05/26069-01.jpg	imported/26069/0	t	0	961	2025-10-24 00:47:16.330678	2025-10-24 00:47:16.330678
1122	http://localhost:3000/uploads/2025/05/26069-02.jpg	imported/26069/1	f	1	961	2025-10-24 00:47:16.333698	2025-10-24 00:47:16.333698
1123	http://localhost:3000/uploads/2025/05/26069-03.jpg	imported/26069/2	f	2	961	2025-10-24 00:47:16.336443	2025-10-24 00:47:16.336443
1124	http://localhost:3000/uploads/2025/05/26073-01-1.jpg	imported/26073/0	t	0	962	2025-10-24 00:47:16.350321	2025-10-24 00:47:16.350321
1125	http://localhost:3000/uploads/2025/05/26073-02-1.jpg	imported/26073/1	f	1	962	2025-10-24 00:47:16.353409	2025-10-24 00:47:16.353409
1126	http://localhost:3000/uploads/2025/05/26073-03-1.jpg	imported/26073/2	f	2	962	2025-10-24 00:47:16.3567	2025-10-24 00:47:16.3567
1127	http://localhost:3000/uploads/2025/05/26074-01.jpg	imported/26074/0	t	0	963	2025-10-24 00:47:16.37064	2025-10-24 00:47:16.37064
1128	http://localhost:3000/uploads/2025/05/26074-03.jpg	imported/26074/1	f	1	963	2025-10-24 00:47:16.373798	2025-10-24 00:47:16.373798
1129	http://localhost:3000/uploads/2025/05/26075-01-1.jpg	imported/26075/0	t	0	964	2025-10-24 00:47:16.387057	2025-10-24 00:47:16.387057
1130	http://localhost:3000/uploads/2025/05/26075-02.jpg	imported/26075/1	f	1	964	2025-10-24 00:47:16.390292	2025-10-24 00:47:16.390292
1131	http://localhost:3000/uploads/2025/05/26075-03.jpg	imported/26075/2	f	2	964	2025-10-24 00:47:16.393292	2025-10-24 00:47:16.393292
1132	http://localhost:3000/uploads/2025/05/26901-01.jpg	imported/26901/0	t	0	965	2025-10-24 00:47:16.406599	2025-10-24 00:47:16.406599
1133	http://localhost:3000/uploads/2025/05/26901-02.jpg	imported/26901/1	f	1	965	2025-10-24 00:47:16.409625	2025-10-24 00:47:16.409625
1134	http://localhost:3000/uploads/2025/05/26901-03.jpg	imported/26901/2	f	2	965	2025-10-24 00:47:16.412254	2025-10-24 00:47:16.412254
1135	http://localhost:3000/uploads/2025/05/34399-01-1.jpg	imported/34399/0	t	0	966	2025-10-24 00:47:16.424266	2025-10-24 00:47:16.424266
1136	http://localhost:3000/uploads/2025/05/35855-01-4.jpg	imported/35855/0	t	0	967	2025-10-24 00:47:16.437009	2025-10-24 00:47:16.437009
1137	http://localhost:3000/uploads/2025/05/35855-02-4.jpg	imported/35855/1	f	1	967	2025-10-24 00:47:16.439732	2025-10-24 00:47:16.439732
1138	http://localhost:3000/uploads/2025/05/35855-03-4.jpg	imported/35855/2	f	2	967	2025-10-24 00:47:16.442268	2025-10-24 00:47:16.442268
1139	http://localhost:3000/uploads/2025/05/27912-01-1.jpg	imported/27912/0	t	0	968	2025-10-24 00:47:16.455687	2025-10-24 00:47:16.455687
1140	http://localhost:3000/uploads/2025/05/27912-02-1.jpg	imported/27912/1	f	1	968	2025-10-24 00:47:16.458517	2025-10-24 00:47:16.458517
1141	http://localhost:3000/uploads/2025/05/27912-03-2.jpg	imported/27912/2	f	2	968	2025-10-24 00:47:16.461747	2025-10-24 00:47:16.461747
1142	http://localhost:3000/uploads/2025/05/35843-01.jpg	imported/35843/0	t	0	969	2025-10-24 00:47:16.474347	2025-10-24 00:47:16.474347
1143	http://localhost:3000/uploads/2025/05/35843-02.jpg	imported/35843/1	f	1	969	2025-10-24 00:47:16.47723	2025-10-24 00:47:16.47723
1144	http://localhost:3000/uploads/2025/05/35843-03.jpg	imported/35843/2	f	2	969	2025-10-24 00:47:16.479937	2025-10-24 00:47:16.479937
1145	http://localhost:3000/uploads/2025/05/35856-01-7.jpg	imported/35856/0	t	0	970	2025-10-24 00:47:16.491917	2025-10-24 00:47:16.491917
1146	http://localhost:3000/uploads/2025/05/35856-02-4.jpg	imported/35856/1	f	1	970	2025-10-24 00:47:16.494582	2025-10-24 00:47:16.494582
1147	http://localhost:3000/uploads/2025/05/35856-03-2.jpg	imported/35856/2	f	2	970	2025-10-24 00:47:16.497138	2025-10-24 00:47:16.497138
1148	http://localhost:3000/uploads/2025/05/35857-01.jpg	imported/35857/0	t	0	971	2025-10-24 00:47:16.509956	2025-10-24 00:47:16.509956
1149	http://localhost:3000/uploads/2025/05/35857-02.jpg	imported/35857/1	f	1	971	2025-10-24 00:47:16.512635	2025-10-24 00:47:16.512635
1150	http://localhost:3000/uploads/2025/05/35857-03.jpg	imported/35857/2	f	2	971	2025-10-24 00:47:16.515391	2025-10-24 00:47:16.515391
1151	http://localhost:3000/uploads/2025/05/20221-01.jpg	imported/20221/0	t	0	972	2025-10-24 00:47:16.527912	2025-10-24 00:47:16.527912
1152	http://localhost:3000/uploads/2025/05/20221-02.jpg	imported/20221/1	f	1	972	2025-10-24 00:47:16.530635	2025-10-24 00:47:16.530635
1153	http://localhost:3000/uploads/2025/05/20221-03.jpg	imported/20221/2	f	2	972	2025-10-24 00:47:16.533288	2025-10-24 00:47:16.533288
1154	http://localhost:3000/uploads/2025/05/20221-04.jpg	imported/20221/3	f	3	972	2025-10-24 00:47:16.535871	2025-10-24 00:47:16.535871
1155	http://localhost:3000/uploads/2025/05/20246-01-1.jpg	imported/20246/0	t	0	973	2025-10-24 00:47:16.548147	2025-10-24 00:47:16.548147
1156	http://localhost:3000/uploads/2025/05/20246-02-1.jpg	imported/20246/1	f	1	973	2025-10-24 00:47:16.551099	2025-10-24 00:47:16.551099
1157	http://localhost:3000/uploads/2025/05/20246-03-1.jpg	imported/20246/2	f	2	973	2025-10-24 00:47:16.553618	2025-10-24 00:47:16.553618
1158	http://localhost:3000/uploads/2025/05/20246-04-1.jpg	imported/20246/3	f	3	973	2025-10-24 00:47:16.556157	2025-10-24 00:47:16.556157
1159	http://localhost:3000/uploads/2025/05/20779-01.jpg	imported/20779/0	t	0	974	2025-10-24 00:47:16.568238	2025-10-24 00:47:16.568238
1160	http://localhost:3000/uploads/2025/05/20779-02.jpg	imported/20779/1	f	1	974	2025-10-24 00:47:16.570975	2025-10-24 00:47:16.570975
1161	http://localhost:3000/uploads/2025/05/20779-03.jpg	imported/20779/2	f	2	974	2025-10-24 00:47:16.57348	2025-10-24 00:47:16.57348
1162	http://localhost:3000/uploads/2025/05/20779-04.jpg	imported/20779/3	f	3	974	2025-10-24 00:47:16.576214	2025-10-24 00:47:16.576214
1163	http://localhost:3000/uploads/2025/05/20854-01.jpg	imported/20854/0	t	0	975	2025-10-24 00:47:16.588182	2025-10-24 00:47:16.588182
1164	http://localhost:3000/uploads/2025/05/20854-02.jpg	imported/20854/1	f	1	975	2025-10-24 00:47:16.590903	2025-10-24 00:47:16.590903
1165	http://localhost:3000/uploads/2025/05/20854-03.jpg	imported/20854/2	f	2	975	2025-10-24 00:47:16.593443	2025-10-24 00:47:16.593443
1166	http://localhost:3000/uploads/2025/05/20854-04.jpg	imported/20854/3	f	3	975	2025-10-24 00:47:16.595968	2025-10-24 00:47:16.595968
1167	http://localhost:3000/uploads/2025/05/20857-01.jpg	imported/20857/0	t	0	976	2025-10-24 00:47:16.624087	2025-10-24 00:47:16.624087
1168	http://localhost:3000/uploads/2025/05/20857-03.jpg	imported/20857/1	f	1	976	2025-10-24 00:47:16.627474	2025-10-24 00:47:16.627474
1169	http://localhost:3000/uploads/2025/05/20857-04.jpg	imported/20857/2	f	2	976	2025-10-24 00:47:16.630802	2025-10-24 00:47:16.630802
1170	http://localhost:3000/uploads/2025/05/20857-05.jpg	imported/20857/3	f	3	976	2025-10-24 00:47:16.634111	2025-10-24 00:47:16.634111
1171	http://localhost:3000/uploads/2025/05/21069-01.jpg	imported/21069/0	t	0	977	2025-10-24 00:47:16.65129	2025-10-24 00:47:16.65129
1172	http://localhost:3000/uploads/2025/05/21069-02.jpg	imported/21069/1	f	1	977	2025-10-24 00:47:16.668548	2025-10-24 00:47:16.668548
1173	http://localhost:3000/uploads/2025/05/21069-03.jpg	imported/21069/2	f	2	977	2025-10-24 00:47:16.67176	2025-10-24 00:47:16.67176
1174	http://localhost:3000/uploads/2025/05/21069-04.jpg	imported/21069/3	f	3	977	2025-10-24 00:47:16.674726	2025-10-24 00:47:16.674726
1175	http://localhost:3000/uploads/2025/05/22783-01.jpg	imported/22783/0	t	0	978	2025-10-24 00:47:16.689585	2025-10-24 00:47:16.689585
1176	http://localhost:3000/uploads/2025/05/22783-02.jpg	imported/22783/1	f	1	978	2025-10-24 00:47:16.692996	2025-10-24 00:47:16.692996
1177	http://localhost:3000/uploads/2025/05/22783-03.jpg	imported/22783/2	f	2	978	2025-10-24 00:47:16.69612	2025-10-24 00:47:16.69612
1178	http://localhost:3000/uploads/2025/05/23088-01-1.jpg	imported/23088/0	t	0	979	2025-10-24 00:47:16.711333	2025-10-24 00:47:16.711333
1179	http://localhost:3000/uploads/2025/05/23088-02-1.jpg	imported/23088/1	f	1	979	2025-10-24 00:47:16.714441	2025-10-24 00:47:16.714441
1180	http://localhost:3000/uploads/2025/05/23088-03-1.jpg	imported/23088/2	f	2	979	2025-10-24 00:47:16.717879	2025-10-24 00:47:16.717879
1181	http://localhost:3000/uploads/2025/05/23731-01.jpg	imported/23731/0	t	0	980	2025-10-24 00:47:16.730859	2025-10-24 00:47:16.730859
1182	http://localhost:3000/uploads/2025/05/23731-02.jpg	imported/23731/1	f	1	980	2025-10-24 00:47:16.733769	2025-10-24 00:47:16.733769
1183	http://localhost:3000/uploads/2025/05/23731-03.jpg	imported/23731/2	f	2	980	2025-10-24 00:47:16.736644	2025-10-24 00:47:16.736644
1184	http://localhost:3000/uploads/2025/05/23922-01.jpg	imported/23922/0	t	0	981	2025-10-24 00:47:16.750011	2025-10-24 00:47:16.750011
1185	http://localhost:3000/uploads/2025/05/23922-02.jpg	imported/23922/1	f	1	981	2025-10-24 00:47:16.753026	2025-10-24 00:47:16.753026
1186	http://localhost:3000/uploads/2025/05/23922-03.jpg	imported/23922/2	f	2	981	2025-10-24 00:47:16.756055	2025-10-24 00:47:16.756055
1187	http://localhost:3000/uploads/2025/05/24562-01.jpg	imported/24562/0	t	0	982	2025-10-24 00:47:16.771452	2025-10-24 00:47:16.771452
1188	http://localhost:3000/uploads/2025/05/24562-02.jpg	imported/24562/1	f	1	982	2025-10-24 00:47:16.774877	2025-10-24 00:47:16.774877
1189	http://localhost:3000/uploads/2025/05/24562-03.jpg	imported/24562/2	f	2	982	2025-10-24 00:47:16.777878	2025-10-24 00:47:16.777878
1190	http://localhost:3000/uploads/2025/05/24562-04.jpg	imported/24562/3	f	3	982	2025-10-24 00:47:16.780851	2025-10-24 00:47:16.780851
1191	http://localhost:3000/uploads/2025/05/25726-01.jpg	imported/25726/0	t	0	983	2025-10-24 00:47:16.797154	2025-10-24 00:47:16.797154
1192	http://localhost:3000/uploads/2025/05/25726-02.jpg	imported/25726/1	f	1	983	2025-10-24 00:47:16.800503	2025-10-24 00:47:16.800503
1193	http://localhost:3000/uploads/2025/05/25726-03.jpg	imported/25726/2	f	2	983	2025-10-24 00:47:16.803549	2025-10-24 00:47:16.803549
1194	http://localhost:3000/uploads/2025/05/25726-04.jpg	imported/25726/3	f	3	983	2025-10-24 00:47:16.806631	2025-10-24 00:47:16.806631
1195	http://localhost:3000/uploads/2025/05/25954-01.jpg	imported/25954/0	t	0	984	2025-10-24 00:47:16.824858	2025-10-24 00:47:16.824858
1196	http://localhost:3000/uploads/2025/05/25954-02.jpg	imported/25954/1	f	1	984	2025-10-24 00:47:16.82804	2025-10-24 00:47:16.82804
1197	http://localhost:3000/uploads/2025/05/25954-03.jpg	imported/25954/2	f	2	984	2025-10-24 00:47:16.831523	2025-10-24 00:47:16.831523
1198	http://localhost:3000/uploads/2025/05/25954-04.jpg	imported/25954/3	f	3	984	2025-10-24 00:47:16.83447	2025-10-24 00:47:16.83447
1199	http://localhost:3000/uploads/2025/05/25955-01.jpg	imported/25955/0	t	0	985	2025-10-24 00:47:16.847134	2025-10-24 00:47:16.847134
1200	http://localhost:3000/uploads/2025/05/25955-02.jpg	imported/25955/1	f	1	985	2025-10-24 00:47:16.849968	2025-10-24 00:47:16.849968
1201	http://localhost:3000/uploads/2025/05/25955-03.jpg	imported/25955/2	f	2	985	2025-10-24 00:47:16.852936	2025-10-24 00:47:16.852936
1202	http://localhost:3000/uploads/2025/05/25955-04.jpg	imported/25955/3	f	3	985	2025-10-24 00:47:16.855633	2025-10-24 00:47:16.855633
1203	http://localhost:3000/uploads/2025/05/26212-01.jpg	imported/26212/0	t	0	986	2025-10-24 00:47:16.868864	2025-10-24 00:47:16.868864
1204	http://localhost:3000/uploads/2025/05/26212-02.jpg	imported/26212/1	f	1	986	2025-10-24 00:47:16.871939	2025-10-24 00:47:16.871939
1205	http://localhost:3000/uploads/2025/05/26212-03.jpg	imported/26212/2	f	2	986	2025-10-24 00:47:16.875118	2025-10-24 00:47:16.875118
1206	http://localhost:3000/uploads/2025/05/26815-01.jpg	imported/26815/0	t	0	987	2025-10-24 00:47:16.887984	2025-10-24 00:47:16.887984
1207	http://localhost:3000/uploads/2025/05/26815-02.jpg	imported/26815/1	f	1	987	2025-10-24 00:47:16.890835	2025-10-24 00:47:16.890835
1208	http://localhost:3000/uploads/2025/05/26815-03.jpg	imported/26815/2	f	2	987	2025-10-24 00:47:16.893632	2025-10-24 00:47:16.893632
1209	http://localhost:3000/uploads/2025/05/26815-04.jpg	imported/26815/3	f	3	987	2025-10-24 00:47:16.896539	2025-10-24 00:47:16.896539
1210	http://localhost:3000/uploads/2025/05/27371-01.jpg	imported/27371/0	t	0	988	2025-10-24 00:47:16.909646	2025-10-24 00:47:16.909646
1211	http://localhost:3000/uploads/2025/05/27371-02.jpg	imported/27371/1	f	1	988	2025-10-24 00:47:16.913647	2025-10-24 00:47:16.913647
1212	http://localhost:3000/uploads/2025/05/27371-03.jpg	imported/27371/2	f	2	988	2025-10-24 00:47:16.916673	2025-10-24 00:47:16.916673
1213	http://localhost:3000/uploads/2025/05/27153-01-2.jpg	imported/27153/0	t	0	989	2025-10-24 00:47:16.929543	2025-10-24 00:47:16.929543
1214	http://localhost:3000/uploads/2025/05/27153-02-2.jpg	imported/27153/1	f	1	989	2025-10-24 00:47:16.932785	2025-10-24 00:47:16.932785
1215	http://localhost:3000/uploads/2025/05/27153-03-2.jpg	imported/27153/2	f	2	989	2025-10-24 00:47:16.935766	2025-10-24 00:47:16.935766
1216	http://localhost:3000/uploads/2025/05/27153-04-2.jpg	imported/27153/3	f	3	989	2025-10-24 00:47:16.938586	2025-10-24 00:47:16.938586
1217	http://localhost:3000/uploads/2025/05/28493-01-1.jpg	imported/28493/0	t	0	990	2025-10-24 00:47:16.951374	2025-10-24 00:47:16.951374
1218	http://localhost:3000/uploads/2025/05/28493-02-1.jpg	imported/28493/1	f	1	990	2025-10-24 00:47:16.954352	2025-10-24 00:47:16.954352
1219	http://localhost:3000/uploads/2025/05/28493-03-1.jpg	imported/28493/2	f	2	990	2025-10-24 00:47:16.957337	2025-10-24 00:47:16.957337
1220	http://localhost:3000/uploads/2025/05/28493-04-1.jpg	imported/28493/3	f	3	990	2025-10-24 00:47:16.961131	2025-10-24 00:47:16.961131
1221	http://localhost:3000/uploads/2025/05/28591-01.jpg	imported/28591/0	t	0	991	2025-10-24 00:47:16.975139	2025-10-24 00:47:16.975139
1222	http://localhost:3000/uploads/2025/05/28591-02.jpg	imported/28591/1	f	1	991	2025-10-24 00:47:16.992279	2025-10-24 00:47:16.992279
1223	http://localhost:3000/uploads/2025/05/28591-03.jpg	imported/28591/2	f	2	991	2025-10-24 00:47:16.995556	2025-10-24 00:47:16.995556
1224	http://localhost:3000/uploads/2025/05/28591-04.jpg	imported/28591/3	f	3	991	2025-10-24 00:47:16.998351	2025-10-24 00:47:16.998351
1225	http://localhost:3000/uploads/2025/05/29276-01-1.jpg	imported/29276/0	t	0	992	2025-10-24 00:47:17.011479	2025-10-24 00:47:17.011479
1226	http://localhost:3000/uploads/2025/05/29276-02-1.jpg	imported/29276/1	f	1	992	2025-10-24 00:47:17.014345	2025-10-24 00:47:17.014345
1227	http://localhost:3000/uploads/2025/05/29276-03-1.jpg	imported/29276/2	f	2	992	2025-10-24 00:47:17.01724	2025-10-24 00:47:17.01724
1228	http://localhost:3000/uploads/2025/05/29276-04-1.jpg	imported/29276/3	f	3	992	2025-10-24 00:47:17.020065	2025-10-24 00:47:17.020065
1229	http://localhost:3000/uploads/2025/05/29276-05-1.jpg	imported/29276/4	f	4	992	2025-10-24 00:47:17.022785	2025-10-24 00:47:17.022785
1230	http://localhost:3000/uploads/2025/05/29969-01-1.jpg	imported/29969/0	t	0	994	2025-10-24 00:47:17.040493	2025-10-24 00:47:17.040493
1231	http://localhost:3000/uploads/2025/05/29969-02-1.jpg	imported/29969/1	f	1	994	2025-10-24 00:47:17.043314	2025-10-24 00:47:17.043314
1232	http://localhost:3000/uploads/2025/05/29969-03-1.jpg	imported/29969/2	f	2	994	2025-10-24 00:47:17.046139	2025-10-24 00:47:17.046139
1233	http://localhost:3000/uploads/2025/05/29969-04-1.jpg	imported/29969/3	f	3	994	2025-10-24 00:47:17.048949	2025-10-24 00:47:17.048949
1234	http://localhost:3000/uploads/2025/05/28209-01.jpg	imported/28209/0	t	0	995	2025-10-24 00:47:17.063859	2025-10-24 00:47:17.063859
1235	http://localhost:3000/uploads/2025/05/28209-02.jpg	imported/28209/1	f	1	995	2025-10-24 00:47:17.067231	2025-10-24 00:47:17.067231
1236	http://localhost:3000/uploads/2025/05/28209-03.jpg	imported/28209/2	f	2	995	2025-10-24 00:47:17.070801	2025-10-24 00:47:17.070801
1237	http://localhost:3000/uploads/2025/05/31163-01.jpg	imported/31163/0	t	0	996	2025-10-24 00:47:17.085254	2025-10-24 00:47:17.085254
1238	http://localhost:3000/uploads/2025/05/31163-02.jpg	imported/31163/1	f	1	996	2025-10-24 00:47:17.088392	2025-10-24 00:47:17.088392
1239	http://localhost:3000/uploads/2025/05/31163-03.jpg	imported/31163/2	f	2	996	2025-10-24 00:47:17.091307	2025-10-24 00:47:17.091307
1240	http://localhost:3000/uploads/2025/05/31163-04.jpg	imported/31163/3	f	3	996	2025-10-24 00:47:17.094113	2025-10-24 00:47:17.094113
1241	http://localhost:3000/uploads/2025/05/31163-05.jpg	imported/31163/4	f	4	996	2025-10-24 00:47:17.097009	2025-10-24 00:47:17.097009
1242	http://localhost:3000/uploads/2025/05/27902-01.jpg	imported/27902/0	t	0	997	2025-10-24 00:47:17.110497	2025-10-24 00:47:17.110497
1243	http://localhost:3000/uploads/2025/05/27902-02.jpg	imported/27902/1	f	1	997	2025-10-24 00:47:17.113371	2025-10-24 00:47:17.113371
1244	http://localhost:3000/uploads/2025/05/27902-03.jpg	imported/27902/2	f	2	997	2025-10-24 00:47:17.116468	2025-10-24 00:47:17.116468
1245	http://localhost:3000/uploads/2025/05/27902-04.jpg	imported/27902/3	f	3	997	2025-10-24 00:47:17.119547	2025-10-24 00:47:17.119547
1246	http://localhost:3000/uploads/2025/05/28066-01.jpg	imported/28066/0	t	0	998	2025-10-24 00:47:17.132862	2025-10-24 00:47:17.132862
1247	http://localhost:3000/uploads/2025/05/28066-02.jpg	imported/28066/1	f	1	998	2025-10-24 00:47:17.135928	2025-10-24 00:47:17.135928
1248	http://localhost:3000/uploads/2025/05/28066-03.jpg	imported/28066/2	f	2	998	2025-10-24 00:47:17.138912	2025-10-24 00:47:17.138912
1249	http://localhost:3000/uploads/2025/05/28066-04.jpg	imported/28066/3	f	3	998	2025-10-24 00:47:17.141915	2025-10-24 00:47:17.141915
1250	http://localhost:3000/uploads/2025/05/30055-01.jpg	imported/30055/0	t	0	999	2025-10-24 00:47:17.156123	2025-10-24 00:47:17.156123
1251	http://localhost:3000/uploads/2025/05/30055-02.jpg	imported/30055/1	f	1	999	2025-10-24 00:47:17.159487	2025-10-24 00:47:17.159487
1252	http://localhost:3000/uploads/2025/05/30055-03.jpg	imported/30055/2	f	2	999	2025-10-24 00:47:17.162716	2025-10-24 00:47:17.162716
1253	http://localhost:3000/uploads/2025/05/30055-04.jpg	imported/30055/3	f	3	999	2025-10-24 00:47:17.165909	2025-10-24 00:47:17.165909
1254	http://localhost:3000/uploads/2025/05/31118-01.jpg	imported/31118/0	t	0	1000	2025-10-24 00:47:17.180317	2025-10-24 00:47:17.180317
1255	http://localhost:3000/uploads/2025/05/31118-02.jpg	imported/31118/1	f	1	1000	2025-10-24 00:47:17.183604	2025-10-24 00:47:17.183604
1256	http://localhost:3000/uploads/2025/05/31118-03.jpg	imported/31118/2	f	2	1000	2025-10-24 00:47:17.187053	2025-10-24 00:47:17.187053
1257	http://localhost:3000/uploads/2025/05/31758-01.jpg	imported/31758/0	t	0	1001	2025-10-24 00:47:17.200667	2025-10-24 00:47:17.200667
1258	http://localhost:3000/uploads/2025/05/31758-02.jpg	imported/31758/1	f	1	1001	2025-10-24 00:47:17.203761	2025-10-24 00:47:17.203761
1259	http://localhost:3000/uploads/2025/05/31758-03.jpg	imported/31758/2	f	2	1001	2025-10-24 00:47:17.206719	2025-10-24 00:47:17.206719
1260	http://localhost:3000/uploads/2025/05/31758-04.jpg	imported/31758/3	f	3	1001	2025-10-24 00:47:17.209921	2025-10-24 00:47:17.209921
1261	http://localhost:3000/uploads/2025/05/31890-01.jpg	imported/31890/0	t	0	1002	2025-10-24 00:47:17.223423	2025-10-24 00:47:17.223423
1262	http://localhost:3000/uploads/2025/05/31890-02.jpg	imported/31890/1	f	1	1002	2025-10-24 00:47:17.226548	2025-10-24 00:47:17.226548
1263	http://localhost:3000/uploads/2025/05/31890-03.jpg	imported/31890/2	f	2	1002	2025-10-24 00:47:17.229479	2025-10-24 00:47:17.229479
1264	http://localhost:3000/uploads/2025/05/31890-04.jpg	imported/31890/3	f	3	1002	2025-10-24 00:47:17.232388	2025-10-24 00:47:17.232388
1265	http://localhost:3000/uploads/2025/05/32479-01.jpg	imported/32479/0	t	0	1003	2025-10-24 00:47:17.24562	2025-10-24 00:47:17.24562
1266	http://localhost:3000/uploads/2025/05/32479-02.jpg	imported/32479/1	f	1	1003	2025-10-24 00:47:17.248631	2025-10-24 00:47:17.248631
1267	http://localhost:3000/uploads/2025/05/32479-03.jpg	imported/32479/2	f	2	1003	2025-10-24 00:47:17.251495	2025-10-24 00:47:17.251495
1268	http://localhost:3000/uploads/2025/05/32479-04.jpg	imported/32479/3	f	3	1003	2025-10-24 00:47:17.254206	2025-10-24 00:47:17.254206
1269	http://localhost:3000/uploads/2025/05/32498-01.jpg	imported/32498/0	t	0	1004	2025-10-24 00:47:17.267091	2025-10-24 00:47:17.267091
1270	http://localhost:3000/uploads/2025/05/32498-02.jpg	imported/32498/1	f	1	1004	2025-10-24 00:47:17.270349	2025-10-24 00:47:17.270349
1271	http://localhost:3000/uploads/2025/05/32498-03.jpg	imported/32498/2	f	2	1004	2025-10-24 00:47:17.273142	2025-10-24 00:47:17.273142
1272	http://localhost:3000/uploads/2025/05/32498-04.jpg	imported/32498/3	f	3	1004	2025-10-24 00:47:17.275729	2025-10-24 00:47:17.275729
1273	http://localhost:3000/uploads/2025/05/32500-01.jpg	imported/32500/0	t	0	1005	2025-10-24 00:47:17.30541	2025-10-24 00:47:17.30541
1274	http://localhost:3000/uploads/2025/05/32500-02.jpg	imported/32500/1	f	1	1005	2025-10-24 00:47:17.30886	2025-10-24 00:47:17.30886
1275	http://localhost:3000/uploads/2025/05/32500-03.jpg	imported/32500/2	f	2	1005	2025-10-24 00:47:17.312151	2025-10-24 00:47:17.312151
1276	http://localhost:3000/uploads/2025/05/32500-04.jpg	imported/32500/3	f	3	1005	2025-10-24 00:47:17.315356	2025-10-24 00:47:17.315356
1277	http://localhost:3000/uploads/2025/05/32572-01.jpg	imported/32572/0	t	0	1006	2025-10-24 00:47:17.328084	2025-10-24 00:47:17.328084
1278	http://localhost:3000/uploads/2025/05/32572-02.jpg	imported/32572/1	f	1	1006	2025-10-24 00:47:17.331029	2025-10-24 00:47:17.331029
1279	http://localhost:3000/uploads/2025/05/32572-03.jpg	imported/32572/2	f	2	1006	2025-10-24 00:47:17.333567	2025-10-24 00:47:17.333567
1280	http://localhost:3000/uploads/2025/05/32572-04.jpg	imported/32572/3	f	3	1006	2025-10-24 00:47:17.33622	2025-10-24 00:47:17.33622
1281	http://localhost:3000/uploads/2025/05/33145-01.jpg	imported/33145/0	t	0	1007	2025-10-24 00:47:17.348723	2025-10-24 00:47:17.348723
1282	http://localhost:3000/uploads/2025/05/33145-02.jpg	imported/33145/1	f	1	1007	2025-10-24 00:47:17.351483	2025-10-24 00:47:17.351483
1283	http://localhost:3000/uploads/2025/05/33145-03.jpg	imported/33145/2	f	2	1007	2025-10-24 00:47:17.354043	2025-10-24 00:47:17.354043
1284	http://localhost:3000/uploads/2025/05/33145-04.jpg	imported/33145/3	f	3	1007	2025-10-24 00:47:17.356549	2025-10-24 00:47:17.356549
1285	http://localhost:3000/uploads/2025/05/33305-01.jpg	imported/33305/0	t	0	1008	2025-10-24 00:47:17.369392	2025-10-24 00:47:17.369392
1286	http://localhost:3000/uploads/2025/05/33305-02.jpg	imported/33305/1	f	1	1008	2025-10-24 00:47:17.372363	2025-10-24 00:47:17.372363
1287	http://localhost:3000/uploads/2025/05/33305-03.jpg	imported/33305/2	f	2	1008	2025-10-24 00:47:17.374981	2025-10-24 00:47:17.374981
1288	http://localhost:3000/uploads/2025/05/33318-01.jpg	imported/33318/0	t	0	1009	2025-10-24 00:47:17.387037	2025-10-24 00:47:17.387037
1289	http://localhost:3000/uploads/2025/05/33318-02.jpg	imported/33318/1	f	1	1009	2025-10-24 00:47:17.389744	2025-10-24 00:47:17.389744
1290	http://localhost:3000/uploads/2025/05/33318-03.jpg	imported/33318/2	f	2	1009	2025-10-24 00:47:17.392264	2025-10-24 00:47:17.392264
1291	http://localhost:3000/uploads/2025/05/33318-04.jpg	imported/33318/3	f	3	1009	2025-10-24 00:47:17.39476	2025-10-24 00:47:17.39476
1292	http://localhost:3000/uploads/2025/05/33470-01.jpg	imported/33470/0	t	0	1010	2025-10-24 00:47:17.408846	2025-10-24 00:47:17.408846
1293	http://localhost:3000/uploads/2025/05/33470-02.jpg	imported/33470/1	f	1	1010	2025-10-24 00:47:17.412028	2025-10-24 00:47:17.412028
1294	http://localhost:3000/uploads/2025/05/33470-03.jpg	imported/33470/2	f	2	1010	2025-10-24 00:47:17.415048	2025-10-24 00:47:17.415048
1295	http://localhost:3000/uploads/2025/05/33470-04.jpg	imported/33470/3	f	3	1010	2025-10-24 00:47:17.418142	2025-10-24 00:47:17.418142
1296	http://localhost:3000/uploads/2025/05/33933-01.jpg	imported/33933/0	t	0	1011	2025-10-24 00:47:17.432048	2025-10-24 00:47:17.432048
1297	http://localhost:3000/uploads/2025/05/33933-02.jpg	imported/33933/1	f	1	1011	2025-10-24 00:47:17.43485	2025-10-24 00:47:17.43485
1298	http://localhost:3000/uploads/2025/05/33933-03.jpg	imported/33933/2	f	2	1011	2025-10-24 00:47:17.438075	2025-10-24 00:47:17.438075
1299	http://localhost:3000/uploads/2025/05/33933-04.jpg	imported/33933/3	f	3	1011	2025-10-24 00:47:17.441053	2025-10-24 00:47:17.441053
1300	http://localhost:3000/uploads/2025/05/33933-05.jpg	imported/33933/4	f	4	1011	2025-10-24 00:47:17.443973	2025-10-24 00:47:17.443973
1301	http://localhost:3000/uploads/2025/05/34307-01.jpg	imported/34307/0	t	0	1012	2025-10-24 00:47:17.456765	2025-10-24 00:47:17.456765
1302	http://localhost:3000/uploads/2025/05/34307-02.jpg	imported/34307/1	f	1	1012	2025-10-24 00:47:17.459717	2025-10-24 00:47:17.459717
1303	http://localhost:3000/uploads/2025/05/34307-03.jpg	imported/34307/2	f	2	1012	2025-10-24 00:47:17.462685	2025-10-24 00:47:17.462685
1304	http://localhost:3000/uploads/2025/05/34371-01.jpg	imported/34371/0	t	0	1013	2025-10-24 00:47:17.477051	2025-10-24 00:47:17.477051
1305	http://localhost:3000/uploads/2025/05/34371-02.jpg	imported/34371/1	f	1	1013	2025-10-24 00:47:17.479885	2025-10-24 00:47:17.479885
1306	http://localhost:3000/uploads/2025/05/34371-03.jpg	imported/34371/2	f	2	1013	2025-10-24 00:47:17.483361	2025-10-24 00:47:17.483361
1307	http://localhost:3000/uploads/2025/05/34371-04.jpg	imported/34371/3	f	3	1013	2025-10-24 00:47:17.48648	2025-10-24 00:47:17.48648
1308	http://localhost:3000/uploads/2025/05/34577-01.jpg	imported/34577/0	t	0	1014	2025-10-24 00:47:17.498706	2025-10-24 00:47:17.498706
1309	http://localhost:3000/uploads/2025/05/34577-02.jpg	imported/34577/1	f	1	1014	2025-10-24 00:47:17.501485	2025-10-24 00:47:17.501485
1310	http://localhost:3000/uploads/2025/05/34577-03.jpg	imported/34577/2	f	2	1014	2025-10-24 00:47:17.504207	2025-10-24 00:47:17.504207
1311	http://localhost:3000/uploads/2025/05/34577-04.jpg	imported/34577/3	f	3	1014	2025-10-24 00:47:17.507296	2025-10-24 00:47:17.507296
1312	http://localhost:3000/uploads/2025/05/34630-01.jpg	imported/34630/0	t	0	1015	2025-10-24 00:47:17.53618	2025-10-24 00:47:17.53618
1313	http://localhost:3000/uploads/2025/05/34630-02.jpg	imported/34630/1	f	1	1015	2025-10-24 00:47:17.539635	2025-10-24 00:47:17.539635
1314	http://localhost:3000/uploads/2025/05/34630-03.jpg	imported/34630/2	f	2	1015	2025-10-24 00:47:17.542705	2025-10-24 00:47:17.542705
1315	http://localhost:3000/uploads/2025/05/34630-04.jpg	imported/34630/3	f	3	1015	2025-10-24 00:47:17.545628	2025-10-24 00:47:17.545628
1316	http://localhost:3000/uploads/2025/05/34745-01.jpg	imported/34745/0	t	0	1016	2025-10-24 00:47:17.558466	2025-10-24 00:47:17.558466
1317	http://localhost:3000/uploads/2025/05/34745-02.jpg	imported/34745/1	f	1	1016	2025-10-24 00:47:17.561361	2025-10-24 00:47:17.561361
1318	http://localhost:3000/uploads/2025/05/34745-03.jpg	imported/34745/2	f	2	1016	2025-10-24 00:47:17.564788	2025-10-24 00:47:17.564788
1319	http://localhost:3000/uploads/2025/05/34745-04.jpg	imported/34745/3	f	3	1016	2025-10-24 00:47:17.567483	2025-10-24 00:47:17.567483
1320	http://localhost:3000/uploads/2025/05/34818-01.jpg	imported/34818/0	t	0	1017	2025-10-24 00:47:17.580541	2025-10-24 00:47:17.580541
1321	http://localhost:3000/uploads/2025/05/34818-02.jpg	imported/34818/1	f	1	1017	2025-10-24 00:47:17.583304	2025-10-24 00:47:17.583304
1322	http://localhost:3000/uploads/2025/05/34818-03.jpg	imported/34818/2	f	2	1017	2025-10-24 00:47:17.586244	2025-10-24 00:47:17.586244
1323	http://localhost:3000/uploads/2025/05/34819-01.jpg	imported/34819/0	t	0	1018	2025-10-24 00:47:17.598993	2025-10-24 00:47:17.598993
1324	http://localhost:3000/uploads/2025/05/34819-02.jpg	imported/34819/1	f	1	1018	2025-10-24 00:47:17.601731	2025-10-24 00:47:17.601731
1325	http://localhost:3000/uploads/2025/05/34819-03.jpg	imported/34819/2	f	2	1018	2025-10-24 00:47:17.604254	2025-10-24 00:47:17.604254
1326	http://localhost:3000/uploads/2025/05/24313-01.jpg	imported/24313/0	t	0	1019	2025-10-24 00:47:17.616334	2025-10-24 00:47:17.616334
1327	http://localhost:3000/uploads/2025/05/24313-02.jpg	imported/24313/1	f	1	1019	2025-10-24 00:47:17.619114	2025-10-24 00:47:17.619114
1328	http://localhost:3000/uploads/2025/05/24313-03.jpg	imported/24313/2	f	2	1019	2025-10-24 00:47:17.621686	2025-10-24 00:47:17.621686
1329	http://localhost:3000/uploads/2025/05/24313-04.jpg	imported/24313/3	f	3	1019	2025-10-24 00:47:17.624699	2025-10-24 00:47:17.624699
1330	http://localhost:3000/uploads/2025/05/22615-01.jpg	imported/22615/0	t	0	1020	2025-10-24 00:47:17.639752	2025-10-24 00:47:17.639752
1331	http://localhost:3000/uploads/2025/05/22615-02.jpg	imported/22615/1	f	1	1020	2025-10-24 00:47:17.643003	2025-10-24 00:47:17.643003
1332	http://localhost:3000/uploads/2025/05/22615-03.jpg	imported/22615/2	f	2	1020	2025-10-24 00:47:17.645849	2025-10-24 00:47:17.645849
1333	http://localhost:3000/uploads/2025/05/22616-01.jpg	imported/22616/0	t	0	1021	2025-10-24 00:47:17.658933	2025-10-24 00:47:17.658933
1334	http://localhost:3000/uploads/2025/05/22616-02.jpg	imported/22616/1	f	1	1021	2025-10-24 00:47:17.66161	2025-10-24 00:47:17.66161
1335	http://localhost:3000/uploads/2025/05/22618-01.jpg	imported/22618/0	t	0	1022	2025-10-24 00:47:17.676494	2025-10-24 00:47:17.676494
1336	http://localhost:3000/uploads/2025/05/22618-03.jpg	imported/22618/1	f	1	1022	2025-10-24 00:47:17.680065	2025-10-24 00:47:17.680065
1337	http://localhost:3000/uploads/2025/05/24475-01.jpg	imported/24475/0	t	0	1023	2025-10-24 00:47:17.693572	2025-10-24 00:47:17.693572
1338	http://localhost:3000/uploads/2025/05/28358-01-2.jpg	imported/28358/0	t	0	1024	2025-10-24 00:47:17.706849	2025-10-24 00:47:17.706849
1339	http://localhost:3000/uploads/2025/05/28719-01.jpg	imported/28719/0	t	0	1025	2025-10-24 00:47:17.719791	2025-10-24 00:47:17.719791
1340	http://localhost:3000/uploads/2025/05/28719-02.jpg	imported/28719/1	f	1	1025	2025-10-24 00:47:17.722597	2025-10-24 00:47:17.722597
1341	http://localhost:3000/uploads/2025/05/31800-01.jpg	imported/31800/0	t	0	1026	2025-10-24 00:47:17.73516	2025-10-24 00:47:17.73516
1342	http://localhost:3000/uploads/2025/05/31800-02.jpg	imported/31800/1	f	1	1026	2025-10-24 00:47:17.737802	2025-10-24 00:47:17.737802
1343	http://localhost:3000/uploads/2025/05/22123-01.jpg	imported/22123/0	t	0	1027	2025-10-24 00:47:17.74996	2025-10-24 00:47:17.74996
1344	http://localhost:3000/uploads/2025/05/22123-02.jpg	imported/22123/1	f	1	1027	2025-10-24 00:47:17.752757	2025-10-24 00:47:17.752757
1345	http://localhost:3000/uploads/2025/05/22161-01.jpg	imported/22161/0	t	0	1028	2025-10-24 00:47:17.767184	2025-10-24 00:47:17.767184
1346	http://localhost:3000/uploads/2025/05/22161-02.jpg	imported/22161/1	f	1	1028	2025-10-24 00:47:17.770247	2025-10-24 00:47:17.770247
1347	http://localhost:3000/uploads/2025/05/22193-01.jpg	imported/22193/0	t	0	1029	2025-10-24 00:47:17.783537	2025-10-24 00:47:17.783537
1348	http://localhost:3000/uploads/2025/05/22193-02.jpg	imported/22193/1	f	1	1029	2025-10-24 00:47:17.786482	2025-10-24 00:47:17.786482
1349	http://localhost:3000/uploads/2025/05/22504-01.jpg	imported/22504/0	t	0	1030	2025-10-24 00:47:17.800476	2025-10-24 00:47:17.800476
1350	http://localhost:3000/uploads/2025/05/22504-02.jpg	imported/22504/1	f	1	1030	2025-10-24 00:47:17.80333	2025-10-24 00:47:17.80333
1351	http://localhost:3000/uploads/2025/05/22505-01.jpg	imported/22505/0	t	0	1031	2025-10-24 00:47:17.816508	2025-10-24 00:47:17.816508
1352	http://localhost:3000/uploads/2025/05/22505-02.jpg	imported/22505/1	f	1	1031	2025-10-24 00:47:17.819326	2025-10-24 00:47:17.819326
1353	http://localhost:3000/uploads/2025/05/22510-01.jpg	imported/22510/0	t	0	1032	2025-10-24 00:47:17.832716	2025-10-24 00:47:17.832716
1354	http://localhost:3000/uploads/2025/05/22512-01.jpg	imported/22512/0	t	0	1033	2025-10-24 00:47:17.845939	2025-10-24 00:47:17.845939
1355	http://localhost:3000/uploads/2025/05/25408-01-1.jpg	imported/25408/0	t	0	1034	2025-10-24 00:47:17.859274	2025-10-24 00:47:17.859274
1356	http://localhost:3000/uploads/2025/05/25689-01-1.jpg	imported/25689/0	t	0	1035	2025-10-24 00:47:17.887511	2025-10-24 00:47:17.887511
1357	http://localhost:3000/uploads/2025/05/25689-02-1.jpg	imported/25689/1	f	1	1035	2025-10-24 00:47:17.890696	2025-10-24 00:47:17.890696
1358	http://localhost:3000/uploads/2025/05/25706-01-2.jpg	imported/25706/0	t	0	1036	2025-10-24 00:47:17.904334	2025-10-24 00:47:17.904334
1359	http://localhost:3000/uploads/2025/05/25706-02-1.jpg	imported/25706/1	f	1	1036	2025-10-24 00:47:17.907176	2025-10-24 00:47:17.907176
1360	http://localhost:3000/uploads/2025/05/27358-01.jpg	imported/27358/0	t	0	1037	2025-10-24 00:47:17.920943	2025-10-24 00:47:17.920943
1361	http://localhost:3000/uploads/2025/05/28534-01-1.jpg	imported/28534/0	t	0	1038	2025-10-24 00:47:17.934484	2025-10-24 00:47:17.934484
1362	http://localhost:3000/uploads/2025/05/28534-02-1.jpg	imported/28534/1	f	1	1038	2025-10-24 00:47:17.937609	2025-10-24 00:47:17.937609
1363	http://localhost:3000/uploads/2025/05/31172-01-1.jpg	imported/31172/0	t	0	1039	2025-10-24 00:47:17.95276	2025-10-24 00:47:17.95276
1364	http://localhost:3000/uploads/2025/05/31172-02-1.jpg	imported/31172/1	f	1	1039	2025-10-24 00:47:17.956179	2025-10-24 00:47:17.956179
1365	http://localhost:3000/uploads/2025/05/31172-03-1.jpg	imported/31172/2	f	2	1039	2025-10-24 00:47:17.959194	2025-10-24 00:47:17.959194
1366	http://localhost:3000/uploads/2025/05/31771-01-1.jpg	imported/31771/0	t	0	1040	2025-10-24 00:47:17.97236	2025-10-24 00:47:17.97236
1367	http://localhost:3000/uploads/2025/05/32537-01.jpg	imported/32537/0	t	0	1041	2025-10-24 00:47:17.985736	2025-10-24 00:47:17.985736
1368	http://localhost:3000/uploads/2025/05/32537-02.jpg	imported/32537/1	f	1	1041	2025-10-24 00:47:17.98877	2025-10-24 00:47:17.98877
1369	http://localhost:3000/uploads/2025/05/33543-01.jpg	imported/33543/0	t	0	1042	2025-10-24 00:47:18.002706	2025-10-24 00:47:18.002706
1370	http://localhost:3000/uploads/2025/05/33543-02.jpg	imported/33543/1	f	1	1042	2025-10-24 00:47:18.005855	2025-10-24 00:47:18.005855
1371	http://localhost:3000/uploads/2025/06/21148-01.jpg	imported/21148/0	t	0	1043	2025-10-24 00:47:18.019399	2025-10-24 00:47:18.019399
1372	http://localhost:3000/uploads/2025/06/21148-02.jpg	imported/21148/1	f	1	1043	2025-10-24 00:47:18.022408	2025-10-24 00:47:18.022408
1373	http://localhost:3000/uploads/2025/06/21148-03.jpg	imported/21148/2	f	2	1043	2025-10-24 00:47:18.025255	2025-10-24 00:47:18.025255
1374	http://localhost:3000/uploads/2025/06/21148-04.jpg	imported/21148/3	f	3	1043	2025-10-24 00:47:18.028073	2025-10-24 00:47:18.028073
1375	http://localhost:3000/uploads/2025/06/24737-01.jpg	imported/24737/0	t	0	1046	2025-10-24 00:47:18.052114	2025-10-24 00:47:18.052114
1376	http://localhost:3000/uploads/2025/06/24737-02.jpg	imported/24737/1	f	1	1046	2025-10-24 00:47:18.055261	2025-10-24 00:47:18.055261
1377	http://localhost:3000/uploads/2025/06/24737-03.jpg	imported/24737/2	f	2	1046	2025-10-24 00:47:18.058144	2025-10-24 00:47:18.058144
1378	http://localhost:3000/uploads/2025/06/28281-01.jpg	imported/28281/0	t	0	1051	2025-10-24 00:47:18.095312	2025-10-24 00:47:18.095312
1379	http://localhost:3000/uploads/2025/06/28281-02.jpg	imported/28281/1	f	1	1051	2025-10-24 00:47:18.09931	2025-10-24 00:47:18.09931
1380	http://localhost:3000/uploads/2025/06/28946-01-1.jpg	imported/28946/0	t	0	1052	2025-10-24 00:47:18.116975	2025-10-24 00:47:18.116975
1381	http://localhost:3000/uploads/2025/06/28946-02-1.jpg	imported/28946/1	f	1	1052	2025-10-24 00:47:18.121021	2025-10-24 00:47:18.121021
1382	http://localhost:3000/uploads/2025/06/28946-03-1.jpg	imported/28946/2	f	2	1052	2025-10-24 00:47:18.124931	2025-10-24 00:47:18.124931
1383	http://localhost:3000/uploads/2025/06/29673-01-1.jpg	imported/29673/0	t	0	1053	2025-10-24 00:47:18.140078	2025-10-24 00:47:18.140078
1384	http://localhost:3000/uploads/2025/06/29673-02-1.jpg	imported/29673/1	f	1	1053	2025-10-24 00:47:18.143543	2025-10-24 00:47:18.143543
1385	http://localhost:3000/uploads/2025/06/29673-03-1.jpg	imported/29673/2	f	2	1053	2025-10-24 00:47:18.146656	2025-10-24 00:47:18.146656
1386	http://localhost:3000/uploads/2025/05/30928-01-1.jpg	imported/30928/0	t	0	1055	2025-10-24 00:47:18.164856	2025-10-24 00:47:18.164856
1387	http://localhost:3000/uploads/2025/05/30928-03-1.jpg	imported/30928/1	f	1	1055	2025-10-24 00:47:18.167806	2025-10-24 00:47:18.167806
1388	http://localhost:3000/uploads/2025/05/30928-04-1.jpg	imported/30928/2	f	2	1055	2025-10-24 00:47:18.170626	2025-10-24 00:47:18.170626
1389	http://localhost:3000/uploads/2025/05/32477-01-2.jpg	imported/32477/0	t	0	1056	2025-10-24 00:47:18.184782	2025-10-24 00:47:18.184782
1390	http://localhost:3000/uploads/2025/05/32477-02-2.jpg	imported/32477/1	f	1	1056	2025-10-24 00:47:18.202363	2025-10-24 00:47:18.202363
1391	http://localhost:3000/uploads/2025/05/32477-03-2.jpg	imported/32477/2	f	2	1056	2025-10-24 00:47:18.206059	2025-10-24 00:47:18.206059
1392	http://localhost:3000/uploads/2025/05/32926-01-1.jpg	imported/32926/0	t	0	1057	2025-10-24 00:47:18.221096	2025-10-24 00:47:18.221096
1393	http://localhost:3000/uploads/2025/05/32926-02-1.jpg	imported/32926/1	f	1	1057	2025-10-24 00:47:18.224426	2025-10-24 00:47:18.224426
1394	http://localhost:3000/uploads/2025/05/32926-03-1.jpg	imported/32926/2	f	2	1057	2025-10-24 00:47:18.227687	2025-10-24 00:47:18.227687
1395	http://localhost:3000/uploads/2025/05/34732-01.jpg	imported/34732/0	t	0	1059	2025-10-24 00:47:18.249114	2025-10-24 00:47:18.249114
1396	http://localhost:3000/uploads/2025/05/34732-02.jpg	imported/34732/1	f	1	1059	2025-10-24 00:47:18.252756	2025-10-24 00:47:18.252756
1397	http://localhost:3000/uploads/2025/05/34732-03.jpg	imported/34732/2	f	2	1059	2025-10-24 00:47:18.255958	2025-10-24 00:47:18.255958
1398	http://localhost:3000/uploads/2025/05/34732-04.jpg	imported/34732/3	f	3	1059	2025-10-24 00:47:18.258929	2025-10-24 00:47:18.258929
1399	http://localhost:3000/uploads/2025/05/40509-01-1.jpg	imported/40509/0	t	0	1060	2025-10-24 00:47:18.27213	2025-10-24 00:47:18.27213
1400	http://localhost:3000/uploads/2025/05/40509-02-1.jpg	imported/40509/1	f	1	1060	2025-10-24 00:47:18.275119	2025-10-24 00:47:18.275119
1401	http://localhost:3000/uploads/2025/05/40509-03-1.jpg	imported/40509/2	f	2	1060	2025-10-24 00:47:18.277797	2025-10-24 00:47:18.277797
1402	http://localhost:3000/uploads/2025/05/40509-04-1.jpg	imported/40509/3	f	3	1060	2025-10-24 00:47:18.280445	2025-10-24 00:47:18.280445
1403	http://localhost:3000/uploads/2025/05/40509-05-1.jpg	imported/40509/4	f	4	1060	2025-10-24 00:47:18.283148	2025-10-24 00:47:18.283148
1404	http://localhost:3000/uploads/2025/05/23104-01.jpg	imported/23104/0	t	0	1061	2025-10-24 00:47:18.295793	2025-10-24 00:47:18.295793
1405	http://localhost:3000/uploads/2025/05/23104-02.jpg	imported/23104/1	f	1	1061	2025-10-24 00:47:18.298945	2025-10-24 00:47:18.298945
1406	http://localhost:3000/uploads/2025/05/25711-01.jpg	imported/25711/0	t	0	1062	2025-10-24 00:47:18.313611	2025-10-24 00:47:18.313611
1407	http://localhost:3000/uploads/2025/05/25711-02.jpg	imported/25711/1	f	1	1062	2025-10-24 00:47:18.316682	2025-10-24 00:47:18.316682
1408	http://localhost:3000/uploads/2025/05/25711-03.jpg	imported/25711/2	f	2	1062	2025-10-24 00:47:18.319836	2025-10-24 00:47:18.319836
1409	http://localhost:3000/uploads/2025/05/31430-01.jpg	imported/31430/0	t	0	1063	2025-10-24 00:47:18.333389	2025-10-24 00:47:18.333389
1410	http://localhost:3000/uploads/2025/05/31430-02.jpg	imported/31430/1	f	1	1063	2025-10-24 00:47:18.336461	2025-10-24 00:47:18.336461
1411	http://localhost:3000/uploads/2025/05/31430-03.jpg	imported/31430/2	f	2	1063	2025-10-24 00:47:18.339367	2025-10-24 00:47:18.339367
1412	http://localhost:3000/uploads/2025/05/31639-01.jpg	imported/31639/0	t	0	1064	2025-10-24 00:47:18.352701	2025-10-24 00:47:18.352701
1413	http://localhost:3000/uploads/2025/05/31639-02.jpg	imported/31639/1	f	1	1064	2025-10-24 00:47:18.355579	2025-10-24 00:47:18.355579
1414	http://localhost:3000/uploads/2025/05/31639-03.jpg	imported/31639/2	f	2	1064	2025-10-24 00:47:18.358274	2025-10-24 00:47:18.358274
1415	http://localhost:3000/uploads/2025/05/31639-04.jpg	imported/31639/3	f	3	1064	2025-10-24 00:47:18.360966	2025-10-24 00:47:18.360966
1416	http://localhost:3000/uploads/2025/05/35665-01.jpg	imported/35665/0	t	0	1065	2025-10-24 00:47:18.373602	2025-10-24 00:47:18.373602
1417	http://localhost:3000/uploads/2025/05/35665-02.jpg	imported/35665/1	f	1	1065	2025-10-24 00:47:18.376455	2025-10-24 00:47:18.376455
1418	http://localhost:3000/uploads/2025/05/35665-03.jpg	imported/35665/2	f	2	1065	2025-10-24 00:47:18.379131	2025-10-24 00:47:18.379131
1419	http://localhost:3000/uploads/2025/05/40524-01.jpg	imported/40524/0	t	0	1066	2025-10-24 00:47:18.392156	2025-10-24 00:47:18.392156
1420	http://localhost:3000/uploads/2025/05/40524-02.jpg	imported/40524/1	f	1	1066	2025-10-24 00:47:18.395625	2025-10-24 00:47:18.395625
1421	http://localhost:3000/uploads/2025/05/40524-03.jpg	imported/40524/2	f	2	1066	2025-10-24 00:47:18.398982	2025-10-24 00:47:18.398982
1422	http://localhost:3000/uploads/2025/05/40524-04.jpg	imported/40524/3	f	3	1066	2025-10-24 00:47:18.40197	2025-10-24 00:47:18.40197
1423	http://localhost:3000/uploads/2025/05/40524-05.jpg	imported/40524/4	f	4	1066	2025-10-24 00:47:18.405798	2025-10-24 00:47:18.405798
1424	http://localhost:3000/uploads/2025/06/40828-01-1.jpg	imported/40828/0	t	0	1067	2025-10-24 00:47:18.420338	2025-10-24 00:47:18.420338
1425	http://localhost:3000/uploads/2025/06/40828-02-1.jpg	imported/40828/1	f	1	1067	2025-10-24 00:47:18.423342	2025-10-24 00:47:18.423342
1426	http://localhost:3000/uploads/2025/06/40828-03-1.jpg	imported/40828/2	f	2	1067	2025-10-24 00:47:18.426212	2025-10-24 00:47:18.426212
1427	http://localhost:3000/uploads/2025/06/40828-04-1.jpg	imported/40828/3	f	3	1067	2025-10-24 00:47:18.428928	2025-10-24 00:47:18.428928
1428	http://localhost:3000/uploads/2025/06/40828-05-1.jpg	imported/40828/4	f	4	1067	2025-10-24 00:47:18.431645	2025-10-24 00:47:18.431645
1429	http://localhost:3000/uploads/2025/06/21059-01.jpg	imported/21059/0	t	0	1068	2025-10-24 00:47:18.444972	2025-10-24 00:47:18.444972
1430	http://localhost:3000/uploads/2025/06/21063-01.jpg	imported/21063/0	t	0	1069	2025-10-24 00:47:18.458052	2025-10-24 00:47:18.458052
1431	http://localhost:3000/uploads/2025/06/21518-01.jpg	imported/21518/0	t	0	1070	2025-10-24 00:47:18.471277	2025-10-24 00:47:18.471277
1432	http://localhost:3000/uploads/2025/06/21783-01.jpg	imported/21783/0	t	0	1071	2025-10-24 00:47:18.485268	2025-10-24 00:47:18.485268
1433	http://localhost:3000/uploads/2025/06/21783-02.jpg	imported/21783/1	f	1	1071	2025-10-24 00:47:18.488169	2025-10-24 00:47:18.488169
1434	http://localhost:3000/uploads/2025/06/21789-01.jpg	imported/21789/0	t	0	1072	2025-10-24 00:47:18.50214	2025-10-24 00:47:18.50214
1435	http://localhost:3000/uploads/2025/06/21789-02.jpg	imported/21789/1	f	1	1072	2025-10-24 00:47:18.505633	2025-10-24 00:47:18.505633
1436	http://localhost:3000/uploads/2025/06/21841-01.jpg	imported/21841/0	t	0	1073	2025-10-24 00:47:18.52009	2025-10-24 00:47:18.52009
1437	http://localhost:3000/uploads/2025/06/21841-02.jpg	imported/21841/1	f	1	1073	2025-10-24 00:47:18.537322	2025-10-24 00:47:18.537322
1438	http://localhost:3000/uploads/2025/06/21841-03.jpg	imported/21841/2	f	2	1073	2025-10-24 00:47:18.54065	2025-10-24 00:47:18.54065
1439	http://localhost:3000/uploads/2025/06/21869-01.jpg	imported/21869/0	t	0	1074	2025-10-24 00:47:18.554202	2025-10-24 00:47:18.554202
1440	http://localhost:3000/uploads/2025/06/21869-02.jpg	imported/21869/1	f	1	1074	2025-10-24 00:47:18.557265	2025-10-24 00:47:18.557265
1441	http://localhost:3000/uploads/2025/06/21871-01.jpg	imported/21871/0	t	0	1075	2025-10-24 00:47:18.570627	2025-10-24 00:47:18.570627
1442	http://localhost:3000/uploads/2025/06/33805-01-1.jpg	imported/33805/0	t	0	1077	2025-10-24 00:47:18.591347	2025-10-24 00:47:18.591347
1443	http://localhost:3000/uploads/2025/06/33805-02-1.jpg	imported/33805/1	f	1	1077	2025-10-24 00:47:18.595185	2025-10-24 00:47:18.595185
1444	http://localhost:3000/uploads/2025/06/33805-03-1.jpg	imported/33805/2	f	2	1077	2025-10-24 00:47:18.598003	2025-10-24 00:47:18.598003
1445	http://localhost:3000/uploads/2025/06/33805-04-1.jpg	imported/33805/3	f	3	1077	2025-10-24 00:47:18.600757	2025-10-24 00:47:18.600757
1446	http://localhost:3000/uploads/2025/06/33805-06-1.jpg	imported/33805/4	f	4	1077	2025-10-24 00:47:18.603842	2025-10-24 00:47:18.603842
1447	http://localhost:3000/uploads/2025/06/33805-07-1.jpg	imported/33805/5	f	5	1077	2025-10-24 00:47:18.606672	2025-10-24 00:47:18.606672
1448	http://localhost:3000/uploads/2025/06/21885-01.jpg	imported/21885/0	t	0	1078	2025-10-24 00:47:18.620927	2025-10-24 00:47:18.620927
1449	http://localhost:3000/uploads/2025/06/21885-03.jpg	imported/21885/1	f	1	1078	2025-10-24 00:47:18.624432	2025-10-24 00:47:18.624432
1450	http://localhost:3000/uploads/2025/06/21889-01.jpg	imported/21889/0	t	0	1079	2025-10-24 00:47:18.638649	2025-10-24 00:47:18.638649
1451	http://localhost:3000/uploads/2025/06/21889-02.jpg	imported/21889/1	f	1	1079	2025-10-24 00:47:18.642024	2025-10-24 00:47:18.642024
1452	http://localhost:3000/uploads/2025/06/21890-01.jpg	imported/21890/0	t	0	1080	2025-10-24 00:47:18.65636	2025-10-24 00:47:18.65636
1453	http://localhost:3000/uploads/2025/06/21891-01-1.jpg	imported/21891/0	t	0	1081	2025-10-24 00:47:18.670087	2025-10-24 00:47:18.670087
1454	http://localhost:3000/uploads/2025/06/21891-02-1.jpg	imported/21891/1	f	1	1081	2025-10-24 00:47:18.673331	2025-10-24 00:47:18.673331
1455	http://localhost:3000/uploads/2025/06/21893-01.jpg	imported/21893/0	t	0	1082	2025-10-24 00:47:18.688156	2025-10-24 00:47:18.688156
1456	http://localhost:3000/uploads/2025/06/21893-02.jpg	imported/21893/1	f	1	1082	2025-10-24 00:47:18.691317	2025-10-24 00:47:18.691317
1457	http://localhost:3000/uploads/2025/06/21943-01-1.jpg	imported/21943/0	t	0	1084	2025-10-24 00:47:18.710571	2025-10-24 00:47:18.710571
1458	http://localhost:3000/uploads/2025/06/21943-02.jpg	imported/21943/1	f	1	1084	2025-10-24 00:47:18.713688	2025-10-24 00:47:18.713688
1459	http://localhost:3000/uploads/2025/06/21979-01.jpg	imported/21979/0	t	0	1085	2025-10-24 00:47:18.728002	2025-10-24 00:47:18.728002
1460	http://localhost:3000/uploads/2025/06/21979-02.jpg	imported/21979/1	f	1	1085	2025-10-24 00:47:18.731327	2025-10-24 00:47:18.731327
1461	http://localhost:3000/uploads/2025/06/21980-01.jpg	imported/21980/0	t	0	1086	2025-10-24 00:47:18.743378	2025-10-24 00:47:18.743378
1462	http://localhost:3000/uploads/2025/06/21980-02.jpg	imported/21980/1	f	1	1086	2025-10-24 00:47:18.746129	2025-10-24 00:47:18.746129
1463	http://localhost:3000/uploads/2025/06/21983-01-2.jpg	imported/21983/0	t	0	1087	2025-10-24 00:47:18.758485	2025-10-24 00:47:18.758485
1464	http://localhost:3000/uploads/2025/06/21983-02-1.jpg	imported/21983/1	f	1	1087	2025-10-24 00:47:18.761241	2025-10-24 00:47:18.761241
1465	http://localhost:3000/uploads/2025/06/21988-01.jpg	imported/21988/0	t	0	1088	2025-10-24 00:47:18.773797	2025-10-24 00:47:18.773797
1466	http://localhost:3000/uploads/2025/06/21988-02.jpg	imported/21988/1	f	1	1088	2025-10-24 00:47:18.776694	2025-10-24 00:47:18.776694
1467	http://localhost:3000/uploads/2025/06/21989-01.jpg	imported/21989/0	t	0	1089	2025-10-24 00:47:18.789997	2025-10-24 00:47:18.789997
1468	http://localhost:3000/uploads/2025/06/21989-02.jpg	imported/21989/1	f	1	1089	2025-10-24 00:47:18.792796	2025-10-24 00:47:18.792796
1469	http://localhost:3000/uploads/2025/06/21984-01-1.jpg	imported/21984/0	t	0	1090	2025-10-24 00:47:18.805698	2025-10-24 00:47:18.805698
1470	http://localhost:3000/uploads/2025/06/21998-01.jpg	imported/21998/0	t	0	1091	2025-10-24 00:47:18.818949	2025-10-24 00:47:18.818949
1471	http://localhost:3000/uploads/2025/06/21993-01-4.jpg	imported/21993/0	t	0	1092	2025-10-24 00:47:18.83393	2025-10-24 00:47:18.83393
1472	http://localhost:3000/uploads/2025/06/21993-02-3.jpg	imported/21993/1	f	1	1092	2025-10-24 00:47:18.836926	2025-10-24 00:47:18.836926
1473	http://localhost:3000/uploads/2025/06/21993-03-3.jpg	imported/21993/2	f	2	1092	2025-10-24 00:47:18.841038	2025-10-24 00:47:18.841038
1474	http://localhost:3000/uploads/2025/06/22394-01-2.jpg	imported/22394/0	t	0	1093	2025-10-24 00:47:18.855862	2025-10-24 00:47:18.855862
1475	http://localhost:3000/uploads/2025/06/22394-02-1.jpg	imported/22394/1	f	1	1093	2025-10-24 00:47:18.859152	2025-10-24 00:47:18.859152
1476	http://localhost:3000/uploads/2025/06/23869-01-2.jpg	imported/23869/0	t	0	1094	2025-10-24 00:47:18.873649	2025-10-24 00:47:18.873649
1477	http://localhost:3000/uploads/2025/06/23869-02-1.jpg	imported/23869/1	f	1	1094	2025-10-24 00:47:18.876656	2025-10-24 00:47:18.876656
1478	http://localhost:3000/uploads/2025/06/23870-01-2.jpg	imported/23870/0	t	0	1095	2025-10-24 00:47:18.889737	2025-10-24 00:47:18.889737
1479	http://localhost:3000/uploads/2025/06/23870-02-1.jpg	imported/23870/1	f	1	1095	2025-10-24 00:47:18.906766	2025-10-24 00:47:18.906766
1480	http://localhost:3000/uploads/2025/06/24159-01-1.jpg	imported/24159/0	t	0	1096	2025-10-24 00:47:18.922535	2025-10-24 00:47:18.922535
1481	http://localhost:3000/uploads/2025/06/24159-02-1.jpg	imported/24159/1	f	1	1096	2025-10-24 00:47:18.925657	2025-10-24 00:47:18.925657
1482	http://localhost:3000/uploads/2025/06/25150-01-2.jpg	imported/25150/0	t	0	1097	2025-10-24 00:47:18.939093	2025-10-24 00:47:18.939093
1483	http://localhost:3000/uploads/2025/06/25170-01-4.jpg	imported/25170/0	t	0	1098	2025-10-24 00:47:18.953341	2025-10-24 00:47:18.953341
1484	http://localhost:3000/uploads/2025/06/25170-02-3.jpg	imported/25170/1	f	1	1098	2025-10-24 00:47:18.956382	2025-10-24 00:47:18.956382
1485	http://localhost:3000/uploads/2025/06/25420-01.jpg	imported/25420/0	t	0	1099	2025-10-24 00:47:18.969765	2025-10-24 00:47:18.969765
1486	http://localhost:3000/uploads/2025/06/25420-02.jpg	imported/25420/1	f	1	1099	2025-10-24 00:47:18.973006	2025-10-24 00:47:18.973006
1487	http://localhost:3000/uploads/2025/06/25420-03.jpg	imported/25420/2	f	2	1099	2025-10-24 00:47:18.976358	2025-10-24 00:47:18.976358
1488	http://localhost:3000/uploads/2025/06/25420-04.jpg	imported/25420/3	f	3	1099	2025-10-24 00:47:18.980169	2025-10-24 00:47:18.980169
1489	http://localhost:3000/uploads/2025/06/25733-01.jpg	imported/25733/0	t	0	1100	2025-10-24 00:47:18.995283	2025-10-24 00:47:18.995283
1490	http://localhost:3000/uploads/2025/06/25733-02.jpg	imported/25733/1	f	1	1100	2025-10-24 00:47:18.998432	2025-10-24 00:47:18.998432
1491	http://localhost:3000/uploads/2025/06/26906-01.webp	imported/26906/0	t	0	1101	2025-10-24 00:47:19.01263	2025-10-24 00:47:19.01263
1492	http://localhost:3000/uploads/2025/06/26906-02.jpg	imported/26906/1	f	1	1101	2025-10-24 00:47:19.016123	2025-10-24 00:47:19.016123
1493	http://localhost:3000/uploads/2025/06/26999-01.jpg	imported/26999/0	t	0	1102	2025-10-24 00:47:19.029644	2025-10-24 00:47:19.029644
1494	http://localhost:3000/uploads/2025/06/26999-03.jpg	imported/26999/1	f	1	1102	2025-10-24 00:47:19.032667	2025-10-24 00:47:19.032667
1495	http://localhost:3000/uploads/2025/06/27023-01.jpg	imported/27023/0	t	0	1103	2025-10-24 00:47:19.046158	2025-10-24 00:47:19.046158
1496	http://localhost:3000/uploads/2025/06/27023-02.jpg	imported/27023/1	f	1	1103	2025-10-24 00:47:19.049199	2025-10-24 00:47:19.049199
1497	http://localhost:3000/uploads/2025/06/27023-03.jpg	imported/27023/2	f	2	1103	2025-10-24 00:47:19.052117	2025-10-24 00:47:19.052117
1498	http://localhost:3000/uploads/2025/06/27047-01.jpg	imported/27047/0	t	0	1104	2025-10-24 00:47:19.065398	2025-10-24 00:47:19.065398
1499	http://localhost:3000/uploads/2025/06/27047-02.jpg	imported/27047/1	f	1	1104	2025-10-24 00:47:19.068367	2025-10-24 00:47:19.068367
1500	http://localhost:3000/uploads/2025/06/27047-03.jpg	imported/27047/2	f	2	1104	2025-10-24 00:47:19.071258	2025-10-24 00:47:19.071258
1501	http://localhost:3000/uploads/2025/06/27787-01.jpg	imported/27787/0	t	0	1105	2025-10-24 00:47:19.084761	2025-10-24 00:47:19.084761
1502	http://localhost:3000/uploads/2025/06/27787-02.jpg	imported/27787/1	f	1	1105	2025-10-24 00:47:19.088166	2025-10-24 00:47:19.088166
1503	http://localhost:3000/uploads/2025/06/27801-01.jpg	imported/27801/0	t	0	1106	2025-10-24 00:47:19.102478	2025-10-24 00:47:19.102478
1504	http://localhost:3000/uploads/2025/06/27801-02.jpg	imported/27801/1	f	1	1106	2025-10-24 00:47:19.105666	2025-10-24 00:47:19.105666
1505	http://localhost:3000/uploads/2025/06/27871-01.jpg	imported/27871/0	t	0	1107	2025-10-24 00:47:19.118683	2025-10-24 00:47:19.118683
1506	http://localhost:3000/uploads/2025/06/27871-02.jpg	imported/27871/1	f	1	1107	2025-10-24 00:47:19.121548	2025-10-24 00:47:19.121548
1507	http://localhost:3000/uploads/2025/06/27871-03.jpg	imported/27871/2	f	2	1107	2025-10-24 00:47:19.124338	2025-10-24 00:47:19.124338
1508	http://localhost:3000/uploads/2025/06/27871-04.jpg	imported/27871/3	f	3	1107	2025-10-24 00:47:19.126996	2025-10-24 00:47:19.126996
1509	http://localhost:3000/uploads/2025/06/27871-05.jpg	imported/27871/4	f	4	1107	2025-10-24 00:47:19.129527	2025-10-24 00:47:19.129527
1510	http://localhost:3000/uploads/2025/06/27873-01.jpg	imported/27873/0	t	0	1108	2025-10-24 00:47:19.142637	2025-10-24 00:47:19.142637
1511	http://localhost:3000/uploads/2025/06/27873-02.jpg	imported/27873/1	f	1	1108	2025-10-24 00:47:19.145373	2025-10-24 00:47:19.145373
1512	http://localhost:3000/uploads/2025/06/27873-04.jpg	imported/27873/2	f	2	1108	2025-10-24 00:47:19.147942	2025-10-24 00:47:19.147942
1513	http://localhost:3000/uploads/2025/06/28342-01.jpg	imported/28342/0	t	0	1109	2025-10-24 00:47:19.161871	2025-10-24 00:47:19.161871
1514	http://localhost:3000/uploads/2025/06/28342-02.jpg	imported/28342/1	f	1	1109	2025-10-24 00:47:19.164673	2025-10-24 00:47:19.164673
1515	http://localhost:3000/uploads/2025/06/28342-03.jpg	imported/28342/2	f	2	1109	2025-10-24 00:47:19.167237	2025-10-24 00:47:19.167237
1516	http://localhost:3000/uploads/2025/06/29202-01-3.jpg	imported/29202/0	t	0	1110	2025-10-24 00:47:19.179636	2025-10-24 00:47:19.179636
1517	http://localhost:3000/uploads/2025/06/29202-02-3.jpg	imported/29202/1	f	1	1110	2025-10-24 00:47:19.184683	2025-10-24 00:47:19.184683
1518	http://localhost:3000/uploads/2025/06/29203-01.jpg	imported/29203/0	t	0	1111	2025-10-24 00:47:19.197365	2025-10-24 00:47:19.197365
1519	http://localhost:3000/uploads/2025/06/29203-02.jpg	imported/29203/1	f	1	1111	2025-10-24 00:47:19.200182	2025-10-24 00:47:19.200182
1520	http://localhost:3000/uploads/2025/06/29346-01.jpg	imported/29346/0	t	0	1112	2025-10-24 00:47:19.21229	2025-10-24 00:47:19.21229
1521	http://localhost:3000/uploads/2025/06/29346-02.jpg	imported/29346/1	f	1	1112	2025-10-24 00:47:19.215022	2025-10-24 00:47:19.215022
1522	http://localhost:3000/uploads/2025/06/29346-03.jpg	imported/29346/2	f	2	1112	2025-10-24 00:47:19.217785	2025-10-24 00:47:19.217785
1523	http://localhost:3000/uploads/2025/06/30274-01-3.jpg	imported/30274/0	t	0	1113	2025-10-24 00:47:19.231698	2025-10-24 00:47:19.231698
1524	http://localhost:3000/uploads/2025/06/30274-02-3.jpg	imported/30274/1	f	1	1113	2025-10-24 00:47:19.252593	2025-10-24 00:47:19.252593
1525	http://localhost:3000/uploads/2025/06/30274-03-2.jpg	imported/30274/2	f	2	1113	2025-10-24 00:47:19.256104	2025-10-24 00:47:19.256104
1526	http://localhost:3000/uploads/2025/06/30238-01.jpg	imported/30238/0	t	0	1114	2025-10-24 00:47:19.271474	2025-10-24 00:47:19.271474
1527	http://localhost:3000/uploads/2025/06/30275-01-6.jpg	imported/30275/0	t	0	1115	2025-10-24 00:47:19.286197	2025-10-24 00:47:19.286197
1528	http://localhost:3000/uploads/2025/06/30275-02-4.jpg	imported/30275/1	f	1	1115	2025-10-24 00:47:19.289435	2025-10-24 00:47:19.289435
1529	http://localhost:3000/uploads/2025/06/31459-01-1.jpg	imported/31459/0	t	0	1116	2025-10-24 00:47:19.303209	2025-10-24 00:47:19.303209
1530	http://localhost:3000/uploads/2025/06/31459-02.jpg	imported/31459/1	f	1	1116	2025-10-24 00:47:19.306385	2025-10-24 00:47:19.306385
1531	http://localhost:3000/uploads/2025/06/31694-02-2.jpg	imported/31694/0	t	0	1117	2025-10-24 00:47:19.319901	2025-10-24 00:47:19.319901
1532	http://localhost:3000/uploads/2025/06/31694-03-2.jpg	imported/31694/1	f	1	1117	2025-10-24 00:47:19.322935	2025-10-24 00:47:19.322935
1533	http://localhost:3000/uploads/2025/06/31891-01-3.jpg	imported/31891/0	t	0	1118	2025-10-24 00:47:19.33617	2025-10-24 00:47:19.33617
1534	http://localhost:3000/uploads/2025/06/31962-02-4.jpg	imported/31962/0	t	0	1119	2025-10-24 00:47:19.349615	2025-10-24 00:47:19.349615
1535	http://localhost:3000/uploads/2025/06/31962-03-3.jpg	imported/31962/1	f	1	1119	2025-10-24 00:47:19.352654	2025-10-24 00:47:19.352654
1536	http://localhost:3000/uploads/2025/06/32409-01-3.jpg	imported/32409/0	t	0	1120	2025-10-24 00:47:19.366087	2025-10-24 00:47:19.366087
1537	http://localhost:3000/uploads/2025/06/32409-02-2.jpg	imported/32409/1	f	1	1120	2025-10-24 00:47:19.369023	2025-10-24 00:47:19.369023
1538	http://localhost:3000/uploads/2025/06/32409-03-2.jpg	imported/32409/2	f	2	1120	2025-10-24 00:47:19.372001	2025-10-24 00:47:19.372001
1539	http://localhost:3000/uploads/2025/06/32410-01-1.jpg	imported/32410/0	t	0	1121	2025-10-24 00:47:19.386014	2025-10-24 00:47:19.386014
1540	http://localhost:3000/uploads/2025/06/32410-02.jpg	imported/32410/1	f	1	1121	2025-10-24 00:47:19.389158	2025-10-24 00:47:19.389158
1541	http://localhost:3000/uploads/2025/06/32925-01-1.jpg	imported/32925/0	t	0	1122	2025-10-24 00:47:19.403522	2025-10-24 00:47:19.403522
1542	http://localhost:3000/uploads/2025/06/32925-02-1.jpg	imported/32925/1	f	1	1122	2025-10-24 00:47:19.406884	2025-10-24 00:47:19.406884
1543	http://localhost:3000/uploads/2025/06/32925-03-1.jpg	imported/32925/2	f	2	1122	2025-10-24 00:47:19.410147	2025-10-24 00:47:19.410147
1544	http://localhost:3000/uploads/2025/06/32925-04-1.jpg	imported/32925/3	f	3	1122	2025-10-24 00:47:19.413199	2025-10-24 00:47:19.413199
1545	http://localhost:3000/uploads/2025/06/32925-05-1.jpg	imported/32925/4	f	4	1122	2025-10-24 00:47:19.416059	2025-10-24 00:47:19.416059
1546	http://localhost:3000/uploads/2025/06/33013-01.jpg	imported/33013/0	t	0	1123	2025-10-24 00:47:19.430042	2025-10-24 00:47:19.430042
1547	http://localhost:3000/uploads/2025/06/33013-02.jpg	imported/33013/1	f	1	1123	2025-10-24 00:47:19.433165	2025-10-24 00:47:19.433165
1548	http://localhost:3000/uploads/2025/06/33527-01.jpg	imported/33527/0	t	0	1124	2025-10-24 00:47:19.446604	2025-10-24 00:47:19.446604
1549	http://localhost:3000/uploads/2025/06/33527-02.jpg	imported/33527/1	f	1	1124	2025-10-24 00:47:19.449564	2025-10-24 00:47:19.449564
1550	http://localhost:3000/uploads/2025/06/33647-01.jpg	imported/33647/0	t	0	1125	2025-10-24 00:47:19.463729	2025-10-24 00:47:19.463729
1551	http://localhost:3000/uploads/2025/06/33881-01.jpg	imported/33881/0	t	0	1126	2025-10-24 00:47:19.477218	2025-10-24 00:47:19.477218
1552	http://localhost:3000/uploads/2025/06/33881-02.jpg	imported/33881/1	f	1	1126	2025-10-24 00:47:19.480047	2025-10-24 00:47:19.480047
1553	http://localhost:3000/uploads/2025/06/35554-01.jpg	imported/35554/0	t	0	1127	2025-10-24 00:47:19.492855	2025-10-24 00:47:19.492855
1554	http://localhost:3000/uploads/2025/06/20884-01.jpg	imported/20884/0	t	0	1128	2025-10-24 00:47:19.505387	2025-10-24 00:47:19.505387
1555	http://localhost:3000/uploads/2025/06/20884-02.jpg	imported/20884/1	f	1	1128	2025-10-24 00:47:19.508177	2025-10-24 00:47:19.508177
1556	http://localhost:3000/uploads/2025/06/20884-03.jpg	imported/20884/2	f	2	1128	2025-10-24 00:47:19.510753	2025-10-24 00:47:19.510753
1557	http://localhost:3000/uploads/2025/06/20884-04.jpg	imported/20884/3	f	3	1128	2025-10-24 00:47:19.513244	2025-10-24 00:47:19.513244
1558	http://localhost:3000/uploads/2025/06/22479-01.jpg	imported/22479/0	t	0	1129	2025-10-24 00:47:19.52602	2025-10-24 00:47:19.52602
1559	http://localhost:3000/uploads/2025/06/22479-02.jpg	imported/22479/1	f	1	1129	2025-10-24 00:47:19.528734	2025-10-24 00:47:19.528734
1560	http://localhost:3000/uploads/2025/06/22624-01.jpg	imported/22624/0	t	0	1130	2025-10-24 00:47:19.540898	2025-10-24 00:47:19.540898
1561	http://localhost:3000/uploads/2025/06/22624-04.jpg	imported/22624/1	f	1	1130	2025-10-24 00:47:19.543556	2025-10-24 00:47:19.543556
1562	http://localhost:3000/uploads/2025/06/22824-02.jpg	imported/22824/0	t	0	1131	2025-10-24 00:47:19.555993	2025-10-24 00:47:19.555993
1563	http://localhost:3000/uploads/2025/06/22829-02.jpg	imported/22829/0	t	0	1132	2025-10-24 00:47:19.577405	2025-10-24 00:47:19.577405
1564	http://localhost:3000/uploads/2025/06/23388-01-2.jpg	imported/23388/0	t	0	1133	2025-10-24 00:47:19.592551	2025-10-24 00:47:19.592551
1565	http://localhost:3000/uploads/2025/06/23388-02-1.jpg	imported/23388/1	f	1	1133	2025-10-24 00:47:19.595886	2025-10-24 00:47:19.595886
1566	http://localhost:3000/uploads/2025/06/23388-03-1.jpg	imported/23388/2	f	2	1133	2025-10-24 00:47:19.599157	2025-10-24 00:47:19.599157
1567	http://localhost:3000/uploads/2025/06/23389-01-2.jpg	imported/23389/0	t	0	1134	2025-10-24 00:47:19.634091	2025-10-24 00:47:19.634091
1568	http://localhost:3000/uploads/2025/06/23389-02-1.jpg	imported/23389/1	f	1	1134	2025-10-24 00:47:19.637571	2025-10-24 00:47:19.637571
1569	http://localhost:3000/uploads/2025/06/22389-01.jpg	imported/22389/0	t	0	1135	2025-10-24 00:47:19.651332	2025-10-24 00:47:19.651332
1570	http://localhost:3000/uploads/2025/06/22389-02.jpg	imported/22389/1	f	1	1135	2025-10-24 00:47:19.65442	2025-10-24 00:47:19.65442
1571	http://localhost:3000/uploads/2025/06/22389-03.jpg	imported/22389/2	f	2	1135	2025-10-24 00:47:19.657415	2025-10-24 00:47:19.657415
1572	http://localhost:3000/uploads/2025/06/23390-01.jpg	imported/23390/0	t	0	1136	2025-10-24 00:47:19.671882	2025-10-24 00:47:19.671882
1573	http://localhost:3000/uploads/2025/06/23390-02.jpg	imported/23390/1	f	1	1136	2025-10-24 00:47:19.674961	2025-10-24 00:47:19.674961
1574	http://localhost:3000/uploads/2025/06/23719-01-4.jpg	imported/23719/0	t	0	1137	2025-10-24 00:47:19.689314	2025-10-24 00:47:19.689314
1575	http://localhost:3000/uploads/2025/06/23719-02-3.jpg	imported/23719/1	f	1	1137	2025-10-24 00:47:19.692804	2025-10-24 00:47:19.692804
1576	http://localhost:3000/uploads/2025/06/23719-03-3.jpg	imported/23719/2	f	2	1137	2025-10-24 00:47:19.696197	2025-10-24 00:47:19.696197
1577	http://localhost:3000/uploads/2025/06/23719-04-2.jpg	imported/23719/3	f	3	1137	2025-10-24 00:47:19.699297	2025-10-24 00:47:19.699297
1578	http://localhost:3000/uploads/2025/06/23719-05-2.jpg	imported/23719/4	f	4	1137	2025-10-24 00:47:19.702498	2025-10-24 00:47:19.702498
1579	http://localhost:3000/uploads/2025/06/24095-02-2.jpg	imported/24095/0	t	0	1138	2025-10-24 00:47:19.715751	2025-10-24 00:47:19.715751
1580	http://localhost:3000/uploads/2025/06/24095-03-2.jpg	imported/24095/1	f	1	1138	2025-10-24 00:47:19.718858	2025-10-24 00:47:19.718858
1581	http://localhost:3000/uploads/2025/06/24190-01-1.jpg	imported/24190/0	t	0	1139	2025-10-24 00:47:19.731961	2025-10-24 00:47:19.731961
1582	http://localhost:3000/uploads/2025/06/24190-02-1.jpg	imported/24190/1	f	1	1139	2025-10-24 00:47:19.734732	2025-10-24 00:47:19.734732
1583	http://localhost:3000/uploads/2025/06/24199-01-8.jpg	imported/24199/0	t	0	1140	2025-10-24 00:47:19.747856	2025-10-24 00:47:19.747856
1584	http://localhost:3000/uploads/2025/06/24199-02-3.jpg	imported/24199/1	f	1	1140	2025-10-24 00:47:19.750766	2025-10-24 00:47:19.750766
1585	http://localhost:3000/uploads/2025/06/24199-03-2.jpg	imported/24199/2	f	2	1140	2025-10-24 00:47:19.75354	2025-10-24 00:47:19.75354
1586	http://localhost:3000/uploads/2025/06/24290-01-2.jpg	imported/24290/0	t	0	1141	2025-10-24 00:47:19.767509	2025-10-24 00:47:19.767509
1587	http://localhost:3000/uploads/2025/06/24290-02-1.jpg	imported/24290/1	f	1	1141	2025-10-24 00:47:19.770759	2025-10-24 00:47:19.770759
1588	http://localhost:3000/uploads/2025/06/24290-03-1.jpg	imported/24290/2	f	2	1141	2025-10-24 00:47:19.774078	2025-10-24 00:47:19.774078
1589	http://localhost:3000/uploads/2025/06/24290-04-1.jpg	imported/24290/3	f	3	1141	2025-10-24 00:47:19.777013	2025-10-24 00:47:19.777013
1590	http://localhost:3000/uploads/2025/06/24554-01-4.jpg	imported/24554/0	t	0	1142	2025-10-24 00:47:19.789546	2025-10-24 00:47:19.789546
1591	http://localhost:3000/uploads/2025/06/24554-02-4.jpg	imported/24554/1	f	1	1142	2025-10-24 00:47:19.792288	2025-10-24 00:47:19.792288
1592	http://localhost:3000/uploads/2025/06/24554-03-4.jpg	imported/24554/2	f	2	1142	2025-10-24 00:47:19.79496	2025-10-24 00:47:19.79496
1593	http://localhost:3000/uploads/2025/06/24554-04-3.jpg	imported/24554/3	f	3	1142	2025-10-24 00:47:19.79796	2025-10-24 00:47:19.79796
1594	http://localhost:3000/uploads/2025/06/24554-05-2.jpg	imported/24554/4	f	4	1142	2025-10-24 00:47:19.801074	2025-10-24 00:47:19.801074
1595	http://localhost:3000/uploads/2025/06/24793-01-5.jpg	imported/24793/0	t	0	1143	2025-10-24 00:47:19.813369	2025-10-24 00:47:19.813369
1596	http://localhost:3000/uploads/2025/06/24793-02-1.jpg	imported/24793/1	f	1	1143	2025-10-24 00:47:19.816127	2025-10-24 00:47:19.816127
1597	http://localhost:3000/uploads/2025/06/24793-03-1.jpg	imported/24793/2	f	2	1143	2025-10-24 00:47:19.818675	2025-10-24 00:47:19.818675
1598	http://localhost:3000/uploads/2025/06/25070-01-3.jpg	imported/25070/0	t	0	1144	2025-10-24 00:47:19.833165	2025-10-24 00:47:19.833165
1599	http://localhost:3000/uploads/2025/06/25070-02-3.jpg	imported/25070/1	f	1	1144	2025-10-24 00:47:19.835926	2025-10-24 00:47:19.835926
1600	http://localhost:3000/uploads/2025/06/25298-03-3.jpg	imported/25298/0	t	0	1145	2025-10-24 00:47:19.848332	2025-10-24 00:47:19.848332
1601	http://localhost:3000/uploads/2025/06/25298-04-2.jpg	imported/25298/1	f	1	1145	2025-10-24 00:47:19.85115	2025-10-24 00:47:19.85115
1602	http://localhost:3000/uploads/2025/06/25298-05-1.jpg	imported/25298/2	f	2	1145	2025-10-24 00:47:19.853686	2025-10-24 00:47:19.853686
1603	http://localhost:3000/uploads/2025/06/25298-06-1.jpg	imported/25298/3	f	3	1145	2025-10-24 00:47:19.856186	2025-10-24 00:47:19.856186
1604	http://localhost:3000/uploads/2025/06/26303-01-4.jpg	imported/26303/0	t	0	1146	2025-10-24 00:47:19.868408	2025-10-24 00:47:19.868408
1605	http://localhost:3000/uploads/2025/06/26303-02-4.jpg	imported/26303/1	f	1	1146	2025-10-24 00:47:19.871156	2025-10-24 00:47:19.871156
1606	http://localhost:3000/uploads/2025/06/26802-01-3.jpg	imported/26802/0	t	0	1147	2025-10-24 00:47:19.884577	2025-10-24 00:47:19.884577
1607	http://localhost:3000/uploads/2025/06/26802-02-3.jpg	imported/26802/1	f	1	1147	2025-10-24 00:47:19.887392	2025-10-24 00:47:19.887392
1608	http://localhost:3000/uploads/2025/06/26802-03-2.jpg	imported/26802/2	f	2	1147	2025-10-24 00:47:19.890109	2025-10-24 00:47:19.890109
1609	http://localhost:3000/uploads/2025/06/27332-01-3.jpg	imported/27332/0	t	0	1148	2025-10-24 00:47:19.903346	2025-10-24 00:47:19.903346
1610	http://localhost:3000/uploads/2025/06/27332-02-2.jpg	imported/27332/1	f	1	1148	2025-10-24 00:47:19.906325	2025-10-24 00:47:19.906325
1611	http://localhost:3000/uploads/2025/06/27332-03-2.jpg	imported/27332/2	f	2	1148	2025-10-24 00:47:19.909088	2025-10-24 00:47:19.909088
1612	http://localhost:3000/uploads/2025/06/28375-01-2.jpg	imported/28375/0	t	0	1149	2025-10-24 00:47:19.92284	2025-10-24 00:47:19.92284
1613	http://localhost:3000/uploads/2025/06/28375-02-2.jpg	imported/28375/1	f	1	1149	2025-10-24 00:47:19.926337	2025-10-24 00:47:19.926337
1614	http://localhost:3000/uploads/2025/06/28375-03-1.jpg	imported/28375/2	f	2	1149	2025-10-24 00:47:19.929634	2025-10-24 00:47:19.929634
1615	http://localhost:3000/uploads/2025/06/28375-04-1.jpg	imported/28375/3	f	3	1149	2025-10-24 00:47:19.93269	2025-10-24 00:47:19.93269
1616	http://localhost:3000/uploads/2025/06/28384-01-1.jpg	imported/28384/0	t	0	1150	2025-10-24 00:47:19.961219	2025-10-24 00:47:19.961219
1617	http://localhost:3000/uploads/2025/06/28384-02-1.jpg	imported/28384/1	f	1	1150	2025-10-24 00:47:19.964605	2025-10-24 00:47:19.964605
1618	http://localhost:3000/uploads/2025/06/28384-03.jpg	imported/28384/2	f	2	1150	2025-10-24 00:47:19.968036	2025-10-24 00:47:19.968036
1619	http://localhost:3000/uploads/2025/06/28384-04.jpg	imported/28384/3	f	3	1150	2025-10-24 00:47:19.971142	2025-10-24 00:47:19.971142
1620	http://localhost:3000/uploads/2025/06/28384-05.jpg	imported/28384/4	f	4	1150	2025-10-24 00:47:19.974125	2025-10-24 00:47:19.974125
1621	http://localhost:3000/uploads/2025/06/28455-01-2.jpg	imported/28455/0	t	0	1151	2025-10-24 00:47:19.988069	2025-10-24 00:47:19.988069
1622	http://localhost:3000/uploads/2025/06/28455-02-2.jpg	imported/28455/1	f	1	1151	2025-10-24 00:47:19.991218	2025-10-24 00:47:19.991218
1623	http://localhost:3000/uploads/2025/06/28455-03-2.jpg	imported/28455/2	f	2	1151	2025-10-24 00:47:19.994139	2025-10-24 00:47:19.994139
1624	http://localhost:3000/uploads/2025/06/28455-04-2.jpg	imported/28455/3	f	3	1151	2025-10-24 00:47:19.997034	2025-10-24 00:47:19.997034
1625	http://localhost:3000/uploads/2025/06/28785-01.jpg	imported/28785/0	t	0	1152	2025-10-24 00:47:20.010761	2025-10-24 00:47:20.010761
1626	http://localhost:3000/uploads/2025/06/28785-03.jpg	imported/28785/1	f	1	1152	2025-10-24 00:47:20.014102	2025-10-24 00:47:20.014102
1627	http://localhost:3000/uploads/2025/06/28785-04.jpg	imported/28785/2	f	2	1152	2025-10-24 00:47:20.017102	2025-10-24 00:47:20.017102
1628	http://localhost:3000/uploads/2025/06/29674-01.jpg	imported/29674/0	t	0	1153	2025-10-24 00:47:20.030598	2025-10-24 00:47:20.030598
1629	http://localhost:3000/uploads/2025/06/29674-02.jpg	imported/29674/1	f	1	1153	2025-10-24 00:47:20.033734	2025-10-24 00:47:20.033734
1630	http://localhost:3000/uploads/2025/06/29674-03.jpg	imported/29674/2	f	2	1153	2025-10-24 00:47:20.036563	2025-10-24 00:47:20.036563
1631	http://localhost:3000/uploads/2025/06/32666-01.jpg	imported/32666/0	t	0	1154	2025-10-24 00:47:20.049882	2025-10-24 00:47:20.049882
1632	http://localhost:3000/uploads/2025/06/32666-02.jpg	imported/32666/1	f	1	1154	2025-10-24 00:47:20.053489	2025-10-24 00:47:20.053489
1633	http://localhost:3000/uploads/2025/06/33910-01.jpg	imported/33910/0	t	0	1155	2025-10-24 00:47:20.070926	2025-10-24 00:47:20.070926
1634	http://localhost:3000/uploads/2025/06/33910-02.jpg	imported/33910/1	f	1	1155	2025-10-24 00:47:20.075018	2025-10-24 00:47:20.075018
1635	http://localhost:3000/uploads/2025/06/33910-03.jpg	imported/33910/2	f	2	1155	2025-10-24 00:47:20.077907	2025-10-24 00:47:20.077907
1636	http://localhost:3000/uploads/2025/06/33910-04.jpg	imported/33910/3	f	3	1155	2025-10-24 00:47:20.080789	2025-10-24 00:47:20.080789
1637	http://localhost:3000/uploads/2025/06/33910-05.jpg	imported/33910/4	f	4	1155	2025-10-24 00:47:20.083718	2025-10-24 00:47:20.083718
1638	http://localhost:3000/uploads/2025/06/34481-01.jpg	imported/34481/0	t	0	1156	2025-10-24 00:47:20.098492	2025-10-24 00:47:20.098492
1639	http://localhost:3000/uploads/2025/06/34481-02.jpg	imported/34481/1	f	1	1156	2025-10-24 00:47:20.10142	2025-10-24 00:47:20.10142
1640	http://localhost:3000/uploads/2025/06/34899-01.jpg	imported/34899/0	t	0	1157	2025-10-24 00:47:20.114283	2025-10-24 00:47:20.114283
1641	http://localhost:3000/uploads/2025/06/34900-01.jpg	imported/34900/0	t	0	1158	2025-10-24 00:47:20.127467	2025-10-24 00:47:20.127467
1642	http://localhost:3000/uploads/2025/06/34900-02.jpg	imported/34900/1	f	1	1158	2025-10-24 00:47:20.130326	2025-10-24 00:47:20.130326
1643	http://localhost:3000/uploads/2025/06/22931-01.jpg	imported/22931/0	t	0	1159	2025-10-24 00:47:20.144964	2025-10-24 00:47:20.144964
1644	http://localhost:3000/uploads/2025/06/22931-02.jpg	imported/22931/1	f	1	1159	2025-10-24 00:47:20.147978	2025-10-24 00:47:20.147978
1645	http://localhost:3000/uploads/2025/06/22931-03.jpg	imported/22931/2	f	2	1159	2025-10-24 00:47:20.151102	2025-10-24 00:47:20.151102
1646	http://localhost:3000/uploads/2025/06/22957-01.jpg	imported/22957/0	t	0	1160	2025-10-24 00:47:20.16513	2025-10-24 00:47:20.16513
1647	http://localhost:3000/uploads/2025/06/22957-02.jpg	imported/22957/1	f	1	1160	2025-10-24 00:47:20.168181	2025-10-24 00:47:20.168181
1648	http://localhost:3000/uploads/2025/06/22957-03.jpg	imported/22957/2	f	2	1160	2025-10-24 00:47:20.171171	2025-10-24 00:47:20.171171
1649	http://localhost:3000/uploads/2025/06/22957-04.jpg	imported/22957/3	f	3	1160	2025-10-24 00:47:20.174141	2025-10-24 00:47:20.174141
1650	http://localhost:3000/uploads/2025/06/24225-01.jpg	imported/24225/0	t	0	1162	2025-10-24 00:47:20.193091	2025-10-24 00:47:20.193091
1651	http://localhost:3000/uploads/2025/06/24225-02.jpg	imported/24225/1	f	1	1162	2025-10-24 00:47:20.196274	2025-10-24 00:47:20.196274
1652	http://localhost:3000/uploads/2025/06/24225-03.jpg	imported/24225/2	f	2	1162	2025-10-24 00:47:20.199287	2025-10-24 00:47:20.199287
1653	http://localhost:3000/uploads/2025/06/24225-04.jpg	imported/24225/3	f	3	1162	2025-10-24 00:47:20.202988	2025-10-24 00:47:20.202988
1654	http://localhost:3000/uploads/2025/06/24227-01.jpg	imported/24227/0	t	0	1163	2025-10-24 00:47:20.216803	2025-10-24 00:47:20.216803
1655	http://localhost:3000/uploads/2025/06/24227-02.jpg	imported/24227/1	f	1	1163	2025-10-24 00:47:20.220013	2025-10-24 00:47:20.220013
1656	http://localhost:3000/uploads/2025/06/24227-03.jpg	imported/24227/2	f	2	1163	2025-10-24 00:47:20.223122	2025-10-24 00:47:20.223122
1657	http://localhost:3000/uploads/2025/06/25073-01.jpg	imported/25073/0	t	0	1164	2025-10-24 00:47:20.236703	2025-10-24 00:47:20.236703
1658	http://localhost:3000/uploads/2025/06/25073-02.jpg	imported/25073/1	f	1	1164	2025-10-24 00:47:20.239762	2025-10-24 00:47:20.239762
1659	http://localhost:3000/uploads/2025/06/25073-03.jpg	imported/25073/2	f	2	1164	2025-10-24 00:47:20.242497	2025-10-24 00:47:20.242497
1660	http://localhost:3000/uploads/2025/06/25466-01.jpg	imported/25466/0	t	0	1165	2025-10-24 00:47:20.255399	2025-10-24 00:47:20.255399
1661	http://localhost:3000/uploads/2025/06/25466-02.jpg	imported/25466/1	f	1	1165	2025-10-24 00:47:20.25824	2025-10-24 00:47:20.25824
1662	http://localhost:3000/uploads/2025/06/25466-03.jpg	imported/25466/2	f	2	1165	2025-10-24 00:47:20.260882	2025-10-24 00:47:20.260882
1663	http://localhost:3000/uploads/2025/06/25466-04.jpg	imported/25466/3	f	3	1165	2025-10-24 00:47:20.263699	2025-10-24 00:47:20.263699
1664	http://localhost:3000/uploads/2025/06/26930-01.jpg	imported/26930/0	t	0	1166	2025-10-24 00:47:20.291683	2025-10-24 00:47:20.291683
1665	http://localhost:3000/uploads/2025/06/26930-02.jpg	imported/26930/1	f	1	1166	2025-10-24 00:47:20.295051	2025-10-24 00:47:20.295051
1666	http://localhost:3000/uploads/2025/06/27701-01.jpg	imported/27701/0	t	0	1167	2025-10-24 00:47:20.308797	2025-10-24 00:47:20.308797
1667	http://localhost:3000/uploads/2025/06/27701-02.jpg	imported/27701/1	f	1	1167	2025-10-24 00:47:20.311739	2025-10-24 00:47:20.311739
1668	http://localhost:3000/uploads/2025/06/27701-03.jpg	imported/27701/2	f	2	1167	2025-10-24 00:47:20.314476	2025-10-24 00:47:20.314476
1669	http://localhost:3000/uploads/2025/06/28374-01.jpg	imported/28374/0	t	0	1168	2025-10-24 00:47:20.327613	2025-10-24 00:47:20.327613
1670	http://localhost:3000/uploads/2025/06/28374-03.jpg	imported/28374/1	f	1	1168	2025-10-24 00:47:20.330542	2025-10-24 00:47:20.330542
1671	http://localhost:3000/uploads/2025/06/28374-04.jpg	imported/28374/2	f	2	1168	2025-10-24 00:47:20.333263	2025-10-24 00:47:20.333263
1672	http://localhost:3000/uploads/2025/06/28374-05.jpg	imported/28374/3	f	3	1168	2025-10-24 00:47:20.336033	2025-10-24 00:47:20.336033
1673	http://localhost:3000/uploads/2025/06/28381-01.jpg	imported/28381/0	t	0	1170	2025-10-24 00:47:20.355384	2025-10-24 00:47:20.355384
1674	http://localhost:3000/uploads/2025/06/28381-02.jpg	imported/28381/1	f	1	1170	2025-10-24 00:47:20.358395	2025-10-24 00:47:20.358395
1675	http://localhost:3000/uploads/2025/06/28458-01-5.jpg	imported/28458/0	t	0	1171	2025-10-24 00:47:20.372555	2025-10-24 00:47:20.372555
1676	http://localhost:3000/uploads/2025/06/28458-02-4.jpg	imported/28458/1	f	1	1171	2025-10-24 00:47:20.375773	2025-10-24 00:47:20.375773
1677	http://localhost:3000/uploads/2025/06/28458-03-3.jpg	imported/28458/2	f	2	1171	2025-10-24 00:47:20.378989	2025-10-24 00:47:20.378989
1678	http://localhost:3000/uploads/2025/06/28459-01.jpg	imported/28459/0	t	0	1172	2025-10-24 00:47:20.393701	2025-10-24 00:47:20.393701
1679	http://localhost:3000/uploads/2025/06/28459-02.jpg	imported/28459/1	f	1	1172	2025-10-24 00:47:20.397002	2025-10-24 00:47:20.397002
1680	http://localhost:3000/uploads/2025/06/28459-03.jpg	imported/28459/2	f	2	1172	2025-10-24 00:47:20.400035	2025-10-24 00:47:20.400035
1681	http://localhost:3000/uploads/2025/06/28459-05.jpg	imported/28459/3	f	3	1172	2025-10-24 00:47:20.403055	2025-10-24 00:47:20.403055
1682	http://localhost:3000/uploads/2025/06/28499-01-3.jpg	imported/28499/0	t	0	1173	2025-10-24 00:47:20.416549	2025-10-24 00:47:20.416549
1683	http://localhost:3000/uploads/2025/06/28499-02-2.jpg	imported/28499/1	f	1	1173	2025-10-24 00:47:20.419588	2025-10-24 00:47:20.419588
1684	http://localhost:3000/uploads/2025/06/28499-03-2.jpg	imported/28499/2	f	2	1173	2025-10-24 00:47:20.422627	2025-10-24 00:47:20.422627
1685	http://localhost:3000/uploads/2025/06/29685-01-3.jpg	imported/29685/0	t	0	1174	2025-10-24 00:47:20.436178	2025-10-24 00:47:20.436178
1686	http://localhost:3000/uploads/2025/06/29685-02-3.jpg	imported/29685/1	f	1	1174	2025-10-24 00:47:20.439208	2025-10-24 00:47:20.439208
1687	http://localhost:3000/uploads/2025/06/29685-03-3.jpg	imported/29685/2	f	2	1174	2025-10-24 00:47:20.44211	2025-10-24 00:47:20.44211
1688	http://localhost:3000/uploads/2025/06/29685-04-2.jpg	imported/29685/3	f	3	1174	2025-10-24 00:47:20.445018	2025-10-24 00:47:20.445018
1689	http://localhost:3000/uploads/2025/06/30606-01-2.jpg	imported/30606/0	t	0	1175	2025-10-24 00:47:20.458372	2025-10-24 00:47:20.458372
1690	http://localhost:3000/uploads/2025/06/30606-02-1.jpg	imported/30606/1	f	1	1175	2025-10-24 00:47:20.461374	2025-10-24 00:47:20.461374
1691	http://localhost:3000/uploads/2025/06/30606-03-1.jpg	imported/30606/2	f	2	1175	2025-10-24 00:47:20.464252	2025-10-24 00:47:20.464252
1692	http://localhost:3000/uploads/2025/07/31393-01.jpg	imported/31393/0	t	0	1176	2025-10-24 00:47:20.477698	2025-10-24 00:47:20.477698
1693	http://localhost:3000/uploads/2025/07/31393-02.jpg	imported/31393/1	f	1	1176	2025-10-24 00:47:20.480672	2025-10-24 00:47:20.480672
1694	http://localhost:3000/uploads/2025/07/31393-03.jpg	imported/31393/2	f	2	1176	2025-10-24 00:47:20.484126	2025-10-24 00:47:20.484126
1695	http://localhost:3000/uploads/2025/07/31393-05.jpg	imported/31393/3	f	3	1176	2025-10-24 00:47:20.487284	2025-10-24 00:47:20.487284
1696	http://localhost:3000/uploads/2025/06/33340-01-3.jpg	imported/33340/0	t	0	1177	2025-10-24 00:47:20.500854	2025-10-24 00:47:20.500854
1697	http://localhost:3000/uploads/2025/06/33340-03-1.jpg	imported/33340/1	f	1	1177	2025-10-24 00:47:20.504183	2025-10-24 00:47:20.504183
1698	http://localhost:3000/uploads/2025/06/33340-04-1.jpg	imported/33340/2	f	2	1177	2025-10-24 00:47:20.50712	2025-10-24 00:47:20.50712
1699	http://localhost:3000/uploads/2025/07/33422-01-3.jpg	imported/33422/0	t	0	1178	2025-10-24 00:47:20.520073	2025-10-24 00:47:20.520073
1700	http://localhost:3000/uploads/2025/07/33422-02-3.jpg	imported/33422/1	f	1	1178	2025-10-24 00:47:20.52322	2025-10-24 00:47:20.52322
1701	http://localhost:3000/uploads/2025/07/33422-03-3.jpg	imported/33422/2	f	2	1178	2025-10-24 00:47:20.526014	2025-10-24 00:47:20.526014
1702	http://localhost:3000/uploads/2025/07/33422-05-2.jpg	imported/33422/3	f	3	1178	2025-10-24 00:47:20.528604	2025-10-24 00:47:20.528604
1703	http://localhost:3000/uploads/2025/06/22823-01-rotated.jpg	imported/22823/0	t	0	1179	2025-10-24 00:47:20.541087	2025-10-24 00:47:20.541087
1704	http://localhost:3000/uploads/2025/06/22823-02.jpg	imported/22823/1	f	1	1179	2025-10-24 00:47:20.543897	2025-10-24 00:47:20.543897
1705	http://localhost:3000/uploads/2025/06/22823-03.jpg	imported/22823/2	f	2	1179	2025-10-24 00:47:20.546594	2025-10-24 00:47:20.546594
1706	http://localhost:3000/uploads/2025/06/23442-01.jpg	imported/23442/0	t	0	1180	2025-10-24 00:47:20.559424	2025-10-24 00:47:20.559424
1707	http://localhost:3000/uploads/2025/06/23442-02.jpg	imported/23442/1	f	1	1180	2025-10-24 00:47:20.562261	2025-10-24 00:47:20.562261
1708	http://localhost:3000/uploads/2025/06/23442-03.jpg	imported/23442/2	f	2	1180	2025-10-24 00:47:20.564883	2025-10-24 00:47:20.564883
1709	http://localhost:3000/uploads/2025/06/24063-01.jpg	imported/24063/0	t	0	1181	2025-10-24 00:47:20.577459	2025-10-24 00:47:20.577459
1710	http://localhost:3000/uploads/2025/06/24063-02.jpg	imported/24063/1	f	1	1181	2025-10-24 00:47:20.580288	2025-10-24 00:47:20.580288
1711	http://localhost:3000/uploads/2025/06/24102-01.png	imported/24102/0	t	0	1182	2025-10-24 00:47:20.609418	2025-10-24 00:47:20.609418
1712	http://localhost:3000/uploads/2025/06/24102-02.jpg	imported/24102/1	f	1	1182	2025-10-24 00:47:20.612851	2025-10-24 00:47:20.612851
1713	http://localhost:3000/uploads/2025/06/24701-01.jpg	imported/24701/0	t	0	1183	2025-10-24 00:47:20.63056	2025-10-24 00:47:20.63056
1714	http://localhost:3000/uploads/2025/06/24701-02.jpg	imported/24701/1	f	1	1183	2025-10-24 00:47:20.634054	2025-10-24 00:47:20.634054
1715	http://localhost:3000/uploads/2025/06/24701-03.jpg	imported/24701/2	f	2	1183	2025-10-24 00:47:20.637741	2025-10-24 00:47:20.637741
1716	http://localhost:3000/uploads/2025/06/24702-02.jpg	imported/24702/0	t	0	1184	2025-10-24 00:47:20.653268	2025-10-24 00:47:20.653268
1717	http://localhost:3000/uploads/2025/06/24702-03.jpg	imported/24702/1	f	1	1184	2025-10-24 00:47:20.656744	2025-10-24 00:47:20.656744
1718	http://localhost:3000/uploads/2025/06/24876-01.jpg	imported/24876/0	t	0	1185	2025-10-24 00:47:20.671669	2025-10-24 00:47:20.671669
1719	http://localhost:3000/uploads/2025/06/24876-03.jpg	imported/24876/1	f	1	1185	2025-10-24 00:47:20.674997	2025-10-24 00:47:20.674997
1720	http://localhost:3000/uploads/2025/06/24876-04.jpg	imported/24876/2	f	2	1185	2025-10-24 00:47:20.678047	2025-10-24 00:47:20.678047
1721	http://localhost:3000/uploads/2025/06/25286-01.jpg	imported/25286/0	t	0	1186	2025-10-24 00:47:20.691633	2025-10-24 00:47:20.691633
1722	http://localhost:3000/uploads/2025/06/25286-02.jpg	imported/25286/1	f	1	1186	2025-10-24 00:47:20.694618	2025-10-24 00:47:20.694618
1723	http://localhost:3000/uploads/2025/06/25286-03.jpg	imported/25286/2	f	2	1186	2025-10-24 00:47:20.697497	2025-10-24 00:47:20.697497
1724	http://localhost:3000/uploads/2025/06/25286-04.jpg	imported/25286/3	f	3	1186	2025-10-24 00:47:20.700309	2025-10-24 00:47:20.700309
1725	http://localhost:3000/uploads/2025/06/26051-01.jpg	imported/26051/0	t	0	1187	2025-10-24 00:47:20.715097	2025-10-24 00:47:20.715097
1726	http://localhost:3000/uploads/2025/06/26051-02.jpg	imported/26051/1	f	1	1187	2025-10-24 00:47:20.71822	2025-10-24 00:47:20.71822
1727	http://localhost:3000/uploads/2025/06/26051-03.jpg	imported/26051/2	f	2	1187	2025-10-24 00:47:20.721148	2025-10-24 00:47:20.721148
1728	http://localhost:3000/uploads/2025/06/26206-01.jpg	imported/26206/0	t	0	1188	2025-10-24 00:47:20.734191	2025-10-24 00:47:20.734191
1729	http://localhost:3000/uploads/2025/06/26206-02.jpg	imported/26206/1	f	1	1188	2025-10-24 00:47:20.736909	2025-10-24 00:47:20.736909
1730	http://localhost:3000/uploads/2025/06/26206-03.jpg	imported/26206/2	f	2	1188	2025-10-24 00:47:20.739504	2025-10-24 00:47:20.739504
1731	http://localhost:3000/uploads/2025/06/26277-01.jpg	imported/26277/0	t	0	1189	2025-10-24 00:47:20.752264	2025-10-24 00:47:20.752264
1732	http://localhost:3000/uploads/2025/06/26277-03.jpg	imported/26277/1	f	1	1189	2025-10-24 00:47:20.755069	2025-10-24 00:47:20.755069
1733	http://localhost:3000/uploads/2025/07/26296-01-1.jpg	imported/26296/0	t	0	1190	2025-10-24 00:47:20.768163	2025-10-24 00:47:20.768163
1734	http://localhost:3000/uploads/2025/07/26296-03-1.jpg	imported/26296/1	f	1	1190	2025-10-24 00:47:20.770865	2025-10-24 00:47:20.770865
1735	http://localhost:3000/uploads/2025/06/27315-01-2.jpg	imported/27315/0	t	0	1191	2025-10-24 00:47:20.783597	2025-10-24 00:47:20.783597
1736	http://localhost:3000/uploads/2025/06/27315-02-1.jpg	imported/27315/1	f	1	1191	2025-10-24 00:47:20.786271	2025-10-24 00:47:20.786271
1737	http://localhost:3000/uploads/2025/06/27315-03.jpg	imported/27315/2	f	2	1191	2025-10-24 00:47:20.788782	2025-10-24 00:47:20.788782
1738	http://localhost:3000/uploads/2025/06/27315-04.jpg	imported/27315/3	f	3	1191	2025-10-24 00:47:20.791282	2025-10-24 00:47:20.791282
1739	http://localhost:3000/uploads/2025/07/27325-01-2.jpg	imported/27325/0	t	0	1192	2025-10-24 00:47:20.803535	2025-10-24 00:47:20.803535
1740	http://localhost:3000/uploads/2025/07/27325-02-2.jpg	imported/27325/1	f	1	1192	2025-10-24 00:47:20.80625	2025-10-24 00:47:20.80625
1741	http://localhost:3000/uploads/2025/07/27325-03-2.jpg	imported/27325/2	f	2	1192	2025-10-24 00:47:20.808737	2025-10-24 00:47:20.808737
1742	http://localhost:3000/uploads/2025/07/27325-04-2.jpg	imported/27325/3	f	3	1192	2025-10-24 00:47:20.811644	2025-10-24 00:47:20.811644
1743	http://localhost:3000/uploads/2025/06/31257-01-2.jpg	imported/31257/0	t	0	1193	2025-10-24 00:47:20.823956	2025-10-24 00:47:20.823956
1744	http://localhost:3000/uploads/2025/06/31257-02-1.jpg	imported/31257/1	f	1	1193	2025-10-24 00:47:20.826629	2025-10-24 00:47:20.826629
1745	http://localhost:3000/uploads/2025/06/31257-03-1.jpg	imported/31257/2	f	2	1193	2025-10-24 00:47:20.829188	2025-10-24 00:47:20.829188
1746	http://localhost:3000/uploads/2025/06/31556-01-1.jpg	imported/31556/0	t	0	1194	2025-10-24 00:47:20.841377	2025-10-24 00:47:20.841377
1747	http://localhost:3000/uploads/2025/06/31556-02.jpg	imported/31556/1	f	1	1194	2025-10-24 00:47:20.844063	2025-10-24 00:47:20.844063
1748	http://localhost:3000/uploads/2025/06/31556-03.jpg	imported/31556/2	f	2	1194	2025-10-24 00:47:20.846552	2025-10-24 00:47:20.846552
1749	http://localhost:3000/uploads/2025/06/31556-04.jpg	imported/31556/3	f	3	1194	2025-10-24 00:47:20.84902	2025-10-24 00:47:20.84902
1750	http://localhost:3000/uploads/2025/06/34466-01.jpg	imported/34466/0	t	0	1195	2025-10-24 00:47:20.861687	2025-10-24 00:47:20.861687
1751	http://localhost:3000/uploads/2025/06/34466-02.jpg	imported/34466/1	f	1	1195	2025-10-24 00:47:20.864498	2025-10-24 00:47:20.864498
1752	http://localhost:3000/uploads/2025/06/34466-03.jpg	imported/34466/2	f	2	1195	2025-10-24 00:47:20.867166	2025-10-24 00:47:20.867166
1753	http://localhost:3000/uploads/2025/07/20746-01.jpg	imported/20746/0	t	0	1196	2025-10-24 00:47:20.880541	2025-10-24 00:47:20.880541
1754	http://localhost:3000/uploads/2025/07/22879-1.jpg	imported/22879/0	t	0	1197	2025-10-24 00:47:20.894349	2025-10-24 00:47:20.894349
1755	http://localhost:3000/uploads/2025/07/24810-01.jpg	imported/24810/0	t	0	1198	2025-10-24 00:47:20.909572	2025-10-24 00:47:20.909572
1756	http://localhost:3000/uploads/2025/07/24811-01.jpg	imported/24811/0	t	0	1199	2025-10-24 00:47:20.923912	2025-10-24 00:47:20.923912
1757	http://localhost:3000/uploads/2025/07/24813-01.jpg	imported/24813/0	t	0	1200	2025-10-24 00:47:20.951517	2025-10-24 00:47:20.951517
1758	http://localhost:3000/uploads/2025/07/25110-01.jpg	imported/25110/0	t	0	1201	2025-10-24 00:47:20.965591	2025-10-24 00:47:20.965591
1759	http://localhost:3000/uploads/2025/07/26011-01-1.jpg	imported/26011/0	t	0	1202	2025-10-24 00:47:20.979195	2025-10-24 00:47:20.979195
1760	http://localhost:3000/uploads/2025/07/26007-01.jpg	imported/26007/0	t	0	1203	2025-10-24 00:47:20.992676	2025-10-24 00:47:20.992676
1761	http://localhost:3000/uploads/2025/07/26706-01.jpg	imported/26706/0	t	0	1204	2025-10-24 00:47:21.005725	2025-10-24 00:47:21.005725
1762	http://localhost:3000/uploads/2025/07/27194-01-1.jpg	imported/27194/0	t	0	1205	2025-10-24 00:47:21.019726	2025-10-24 00:47:21.019726
1763	http://localhost:3000/uploads/2025/07/29282-01-1.jpg	imported/29282/0	t	0	1206	2025-10-24 00:47:21.034595	2025-10-24 00:47:21.034595
1764	http://localhost:3000/uploads/2025/07/26707-01.jpg	imported/26707/0	t	0	1207	2025-10-24 00:47:21.048874	2025-10-24 00:47:21.048874
1776	http://localhost:3000/uploads/2025/07/22064-01.jpg	imported/22064/0	t	0	1219	2025-10-24 00:47:21.21366	2025-10-24 00:47:21.21366
1777	http://localhost:3000/uploads/2025/07/22044-01.jpg	imported/22044/0	t	0	1220	2025-10-24 00:47:21.226481	2025-10-24 00:47:21.226481
1778	http://localhost:3000/uploads/2025/07/22066-01.jpg	imported/22066/0	t	0	1221	2025-10-24 00:47:21.239007	2025-10-24 00:47:21.239007
1779	http://localhost:3000/uploads/2025/07/22069-01.jpg	imported/22069/0	t	0	1222	2025-10-24 00:47:21.252547	2025-10-24 00:47:21.252547
1780	http://localhost:3000/uploads/2025/07/22071-01.jpg	imported/22071/0	t	0	1223	2025-10-24 00:47:21.266108	2025-10-24 00:47:21.266108
1781	http://localhost:3000/uploads/2025/07/22072-01.jpg	imported/22072/0	t	0	1224	2025-10-24 00:47:21.279557	2025-10-24 00:47:21.279557
1782	http://localhost:3000/uploads/2025/07/22075-01.jpg	imported/22075/0	t	0	1225	2025-10-24 00:47:21.292973	2025-10-24 00:47:21.292973
1783	http://localhost:3000/uploads/2025/07/22090-01.jpg	imported/22090/0	t	0	1226	2025-10-24 00:47:21.305655	2025-10-24 00:47:21.305655
1784	http://localhost:3000/uploads/2025/07/22117-01.jpg	imported/22117/0	t	0	1227	2025-10-24 00:47:21.318465	2025-10-24 00:47:21.318465
1785	http://localhost:3000/uploads/2025/07/22128-01-3.jpg	imported/22128/0	t	0	1228	2025-10-24 00:47:21.331438	2025-10-24 00:47:21.331438
1786	http://localhost:3000/uploads/2025/07/22203-01-2.jpg	imported/22203/0	t	0	1229	2025-10-24 00:47:21.343763	2025-10-24 00:47:21.343763
1787	http://localhost:3000/uploads/2025/07/22208-01.jpg	imported/22208/0	t	0	1230	2025-10-24 00:47:21.359406	2025-10-24 00:47:21.359406
1788	http://localhost:3000/uploads/2025/07/21591-01.jpg	imported/21591/0	t	0	1231	2025-10-24 00:47:21.389534	2025-10-24 00:47:21.389534
1789	http://localhost:3000/uploads/2025/07/21895-01.jpg	imported/21895/0	t	0	1232	2025-10-24 00:47:21.403725	2025-10-24 00:47:21.403725
1790	http://localhost:3000/uploads/2025/07/30312-01.jpg	imported/30312/0	t	0	1233	2025-10-24 00:47:21.41729	2025-10-24 00:47:21.41729
1791	http://localhost:3000/uploads/2025/07/30315-01-1.jpg	imported/30315/0	t	0	1234	2025-10-24 00:47:21.430963	2025-10-24 00:47:21.430963
1792	http://localhost:3000/uploads/2025/07/30334-01-1.jpg	imported/30334/0	t	0	1235	2025-10-24 00:47:21.444541	2025-10-24 00:47:21.444541
1793	http://localhost:3000/uploads/2025/07/24752-01.jpg	imported/24752/0	t	0	1236	2025-10-24 00:47:21.458527	2025-10-24 00:47:21.458527
1794	http://localhost:3000/uploads/2025/07/30340-01.jpg	imported/30340/0	t	0	1237	2025-10-24 00:47:21.474367	2025-10-24 00:47:21.474367
1795	http://localhost:3000/uploads/2025/07/30310-01.jpg	imported/30310/0	t	0	1238	2025-10-24 00:47:21.48793	2025-10-24 00:47:21.48793
1796	http://localhost:3000/uploads/2025/07/30664-01.jpg	imported/30664/0	t	0	1239	2025-10-24 00:47:21.501376	2025-10-24 00:47:21.501376
1797	http://localhost:3000/uploads/2025/07/30313-01.jpg	imported/30313/0	t	0	1240	2025-10-24 00:47:21.517839	2025-10-24 00:47:21.517839
1798	http://localhost:3000/uploads/2025/07/30665-01.jpg	imported/30665/0	t	0	1241	2025-10-24 00:47:21.533019	2025-10-24 00:47:21.533019
1799	http://localhost:3000/uploads/2025/07/24753-01.jpg	imported/24753/0	t	0	1242	2025-10-24 00:47:21.547696	2025-10-24 00:47:21.547696
1800	http://localhost:3000/uploads/2025/07/30314-01.jpg	imported/30314/0	t	0	1243	2025-10-24 00:47:21.563997	2025-10-24 00:47:21.563997
1801	http://localhost:3000/uploads/2025/07/33314-01.jpg	imported/33314/0	t	0	1244	2025-10-24 00:47:21.581411	2025-10-24 00:47:21.581411
1802	http://localhost:3000/uploads/2025/07/25431-01-1.jpg	imported/25431/0	t	0	1245	2025-10-24 00:47:21.607244	2025-10-24 00:47:21.607244
1803	http://localhost:3000/uploads/2025/07/30324-01.jpg	imported/30324/0	t	0	1246	2025-10-24 00:47:21.621613	2025-10-24 00:47:21.621613
1804	http://localhost:3000/uploads/2025/07/30347-01.jpg	imported/30347/0	t	0	1247	2025-10-24 00:47:21.635021	2025-10-24 00:47:21.635021
1805	http://localhost:3000/uploads/2025/07/30354-01-1.jpg	imported/30354/0	t	0	1248	2025-10-24 00:47:21.647542	2025-10-24 00:47:21.647542
1806	http://localhost:3000/uploads/2025/07/24479-01-1.jpg	imported/24479/0	t	0	1249	2025-10-24 00:47:21.660511	2025-10-24 00:47:21.660511
1807	http://localhost:3000/uploads/2025/07/30362-01-1.jpg	imported/30362/0	t	0	1250	2025-10-24 00:47:21.67385	2025-10-24 00:47:21.67385
1808	http://localhost:3000/uploads/2025/07/30326-01.jpg	imported/30326/0	t	0	1251	2025-10-24 00:47:21.687958	2025-10-24 00:47:21.687958
1809	http://localhost:3000/uploads/2025/07/30349-01.jpg	imported/30349/0	t	0	1252	2025-10-24 00:47:21.702585	2025-10-24 00:47:21.702585
1810	http://localhost:3000/uploads/2025/07/30366-01.jpg	imported/30366/0	t	0	1253	2025-10-24 00:47:21.716846	2025-10-24 00:47:21.716846
1811	http://localhost:3000/uploads/2025/07/30350-01.jpg	imported/30350/0	t	0	1254	2025-10-24 00:47:21.730916	2025-10-24 00:47:21.730916
1812	http://localhost:3000/uploads/2025/07/30367-01.jpg	imported/30367/0	t	0	1255	2025-10-24 00:47:21.745332	2025-10-24 00:47:21.745332
1813	http://localhost:3000/uploads/2025/07/30351-01.jpg	imported/30351/0	t	0	1256	2025-10-24 00:47:21.759873	2025-10-24 00:47:21.759873
1814	http://localhost:3000/uploads/2025/07/30327-01.jpg	imported/30327/0	t	0	1257	2025-10-24 00:47:21.775252	2025-10-24 00:47:21.775252
1815	http://localhost:3000/uploads/2025/07/30368-01.jpg	imported/30368/0	t	0	1258	2025-10-24 00:47:21.789421	2025-10-24 00:47:21.789421
1816	http://localhost:3000/uploads/2025/07/30357-01-1.jpg	imported/30357/0	t	0	1259	2025-10-24 00:47:21.803358	2025-10-24 00:47:21.803358
1817	http://localhost:3000/uploads/2025/07/30361-01.jpg	imported/30361/0	t	0	1260	2025-10-24 00:47:21.815931	2025-10-24 00:47:21.815931
1818	http://localhost:3000/uploads/2025/07/30348-01.jpg	imported/30348/0	t	0	1261	2025-10-24 00:47:21.828767	2025-10-24 00:47:21.828767
1819	http://localhost:3000/uploads/2025/07/30369-01-2.jpg	imported/30369/0	t	0	1262	2025-10-24 00:47:21.841278	2025-10-24 00:47:21.841278
1820	http://localhost:3000/uploads/2025/07/30363-01.jpg	imported/30363/0	t	0	1263	2025-10-24 00:47:21.854611	2025-10-24 00:47:21.854611
1821	http://localhost:3000/uploads/2025/07/30360-01.jpg	imported/30360/0	t	0	1264	2025-10-24 00:47:21.867442	2025-10-24 00:47:21.867442
1822	http://localhost:3000/uploads/2025/07/30658-01-1.jpg	imported/30658/0	t	0	1265	2025-10-24 00:47:21.880306	2025-10-24 00:47:21.880306
1823	http://localhost:3000/uploads/2025/07/30365-01.jpg	imported/30365/0	t	0	1266	2025-10-24 00:47:21.89428	2025-10-24 00:47:21.89428
1824	http://localhost:3000/uploads/2025/07/30670-01.jpg	imported/30670/0	t	0	1267	2025-10-24 00:47:21.907999	2025-10-24 00:47:21.907999
1825	http://localhost:3000/uploads/2025/07/30656-01.jpg	imported/30656/0	t	0	1268	2025-10-24 00:47:21.921329	2025-10-24 00:47:21.921329
1826	http://localhost:3000/uploads/2025/07/30341-01.jpg	imported/30341/0	t	0	1269	2025-10-24 00:47:21.935601	2025-10-24 00:47:21.935601
1	http://localhost:3000/uploads/2023/12/22022-01.jpg	imported/22022/0	t	0	1	2025-10-24 00:47:00.490185	2025-10-24 00:47:00.490185
2	http://localhost:3000/uploads/2024/02/22179-01-1.jpg	imported/22179/0	t	0	2	2025-10-24 00:47:00.528995	2025-10-24 00:47:00.528995
3	http://localhost:3000/uploads/2024/02/24954-01.jpg	imported/24954/0	t	0	3	2025-10-24 00:47:00.561209	2025-10-24 00:47:00.561209
4	http://localhost:3000/uploads/2024/06/20957-01.jpg	imported/20957/0	t	0	4	2025-10-24 00:47:00.586928	2025-10-24 00:47:00.586928
5	http://localhost:3000/uploads/2025/05/20957-02.jpg	imported/20957/1	f	1	4	2025-10-24 00:47:00.593149	2025-10-24 00:47:00.593149
6	http://localhost:3000/uploads/2025/05/20957-03.jpg	imported/20957/2	f	2	4	2025-10-24 00:47:00.600388	2025-10-24 00:47:00.600388
7	http://localhost:3000/uploads/2025/05/20957-04.jpg	imported/20957/3	f	3	4	2025-10-24 00:47:00.606891	2025-10-24 00:47:00.606891
8	http://localhost:3000/uploads/2025/05/20957-05.jpg	imported/20957/4	f	4	4	2025-10-24 00:47:00.612174	2025-10-24 00:47:00.612174
9	http://localhost:3000/uploads/2024/02/31907-01-1.jpg	imported/31907/0	t	0	5	2025-10-24 00:47:00.636427	2025-10-24 00:47:00.636427
10	http://localhost:3000/uploads/2024/06/27561-01.jpg	imported/27561/0	t	0	6	2025-10-24 00:47:00.659755	2025-10-24 00:47:00.659755
11	http://localhost:3000/uploads/2024/06/27561-02.jpg	imported/27561/1	f	1	6	2025-10-24 00:47:00.664673	2025-10-24 00:47:00.664673
12	http://localhost:3000/uploads/2024/06/33927-01.jpg	imported/33927/0	t	0	7	2025-10-24 00:47:00.687223	2025-10-24 00:47:00.687223
13	http://localhost:3000/uploads/2024/08/23105-01-1.png	imported/23105/0	t	0	8	2025-10-24 00:47:00.723786	2025-10-24 00:47:00.723786
14	http://localhost:3000/uploads/2024/06/20766-01.jpg	imported/20766/0	t	0	9	2025-10-24 00:47:00.744461	2025-10-24 00:47:00.744461
15	http://localhost:3000/uploads/2024/02/25855-01.jpg	imported/25855/0	t	0	10	2025-10-24 00:47:00.764191	2025-10-24 00:47:00.764191
16	http://localhost:3000/uploads/2024/02/32475-01-1.jpg	imported/32475/0	t	0	11	2025-10-24 00:47:00.785466	2025-10-24 00:47:00.785466
17	http://localhost:3000/uploads/2024/02/34640-01-1.jpg	imported/34640/0	t	0	12	2025-10-24 00:47:00.805877	2025-10-24 00:47:00.805877
18	http://localhost:3000/uploads/2024/02/31464-01-1.jpg	imported/31464/0	t	0	13	2025-10-24 00:47:00.825144	2025-10-24 00:47:00.825144
19	http://localhost:3000/uploads/2024/02/31464-01-1.jpg	imported/31464/1	f	1	13	2025-10-24 00:47:00.830141	2025-10-24 00:47:00.830141
20	http://localhost:3000/uploads/2024/05/20563-01.jpg	imported/20563/0	t	0	14	2025-10-24 00:47:00.851415	2025-10-24 00:47:00.851415
21	http://localhost:3000/uploads/2024/02/26804-01-1.jpg	imported/26804/0	t	0	15	2025-10-24 00:47:00.872877	2025-10-24 00:47:00.872877
22	http://localhost:3000/uploads/2024/03/22925-01.jpg	imported/22925/0	t	0	16	2025-10-24 00:47:00.892251	2025-10-24 00:47:00.892251
23	http://localhost:3000/uploads/2025/05/22925-02.jpg	imported/22925/1	f	1	16	2025-10-24 00:47:00.896647	2025-10-24 00:47:00.896647
24	http://localhost:3000/uploads/2025/05/22925-03.jpg	imported/22925/2	f	2	16	2025-10-24 00:47:00.900891	2025-10-24 00:47:00.900891
25	http://localhost:3000/uploads/2024/03/20784-01.jpg	imported/20784/0	t	0	17	2025-10-24 00:47:00.918995	2025-10-24 00:47:00.918995
26	http://localhost:3000/uploads/2025/05/20784-02.jpg	imported/20784/1	f	1	17	2025-10-24 00:47:00.923861	2025-10-24 00:47:00.923861
27	http://localhost:3000/uploads/2025/05/20784-03.jpg	imported/20784/2	f	2	17	2025-10-24 00:47:00.928426	2025-10-24 00:47:00.928426
28	http://localhost:3000/uploads/2024/03/20767-01.jpg	imported/20767/0	t	0	18	2025-10-24 00:47:00.947747	2025-10-24 00:47:00.947747
29	http://localhost:3000/uploads/2024/03/31469-01.jpg	imported/31469/0	t	0	19	2025-10-24 00:47:00.96647	2025-10-24 00:47:00.96647
1765	http://localhost:3000/uploads/2025/07/35041-01-2.jpg	imported/35041/0	t	0	1208	2025-10-24 00:47:21.06202	2025-10-24 00:47:21.06202
1766	http://localhost:3000/uploads/2025/07/22209-01.jpg	imported/22209/0	t	0	1209	2025-10-24 00:47:21.07644	2025-10-24 00:47:21.07644
1767	http://localhost:3000/uploads/2025/07/26014-01.jpg	imported/26014/0	t	0	1210	2025-10-24 00:47:21.089329	2025-10-24 00:47:21.089329
1768	http://localhost:3000/uploads/2025/07/34463-01.png	imported/34463/0	t	0	1211	2025-10-24 00:47:21.102368	2025-10-24 00:47:21.102368
1769	http://localhost:3000/uploads/2025/07/21883-01-.jpg	imported/21883/0	t	0	1212	2025-10-24 00:47:21.116381	2025-10-24 00:47:21.116381
1770	http://localhost:3000/uploads/2025/07/21884-01.jpg	imported/21884/0	t	0	1213	2025-10-24 00:47:21.130862	2025-10-24 00:47:21.130862
1771	http://localhost:3000/uploads/2025/07/22038-01.jpg	imported/22038/0	t	0	1214	2025-10-24 00:47:21.144364	2025-10-24 00:47:21.144364
1772	http://localhost:3000/uploads/2025/07/22042-01.jpg	imported/22042/0	t	0	1215	2025-10-24 00:47:21.158244	2025-10-24 00:47:21.158244
1773	http://localhost:3000/uploads/2025/07/22052-01.jpg	imported/22052/0	t	0	1216	2025-10-24 00:47:21.172795	2025-10-24 00:47:21.172795
1774	http://localhost:3000/uploads/2025/07/22056-01.jpg	imported/22056/0	t	0	1217	2025-10-24 00:47:21.18769	2025-10-24 00:47:21.18769
1775	http://localhost:3000/uploads/2025/07/22043-01.jpg	imported/22043/0	t	0	1218	2025-10-24 00:47:21.201132	2025-10-24 00:47:21.201132
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, uuid, name, sku, inventory, price, created_at, updated_at, deleted_at, description, "shortDescription", type, published, featured, visibility, barcode, tags) FROM stdin;
1	8721c6d1-c05a-49fe-b03a-69b97b923c0a	BROCHA 3PZA AMARILLAS EXXEL 00-005-186	22022	21	2.00	2025-10-24 00:47:00.421207	2025-10-24 00:47:00.421207	\N	\N	\N	simple	t	f	visible	\N	
2	b700c19c-ed23-4f52-9148-77e21a7e66b8	LIJADORA D/PALMA SKIL 1.4AMP 200W 7232	22179	0	65.00	2025-10-24 00:47:00.508832	2025-10-24 00:47:00.508832	\N	\N	\N	simple	t	f	visible	\N	
3	999b8d2c-b543-4e02-b3bd-b3d6521b2aef	WC CARLTON BLANCO TAP/ORQ NEG P/FLUXOM	24954	1	138.00	2025-10-24 00:47:00.543737	2025-10-24 00:47:00.543737	\N	\N	\N	simple	t	f	visible	\N	
4	9e573821-823e-44bc-937a-8ff85369c95f	TALADRO 1/2 550W 4.7AMP PRO-TP550KIT PROMAKER	20957	3	100.00	2025-10-24 00:47:00.571411	2025-10-24 00:47:00.571411	\N	\N	\N	simple	t	f	visible	\N	
5	96367bc9-cdd8-427f-afef-be9fa3c20fab	LIJADORA D/PALMA 1/2HOJ 300W PROMAKER	31907	2	94.00	2025-10-24 00:47:00.622311	2025-10-24 00:47:00.622311	\N	\N	\N	simple	t	f	visible	\N	
6	686f29d9-214a-4048-99d8-e2ce14c1ccc2	HIDROLIMP 1400W 1450PSI PRO-H1400 PROMAKER	27561	2	182.00	2025-10-24 00:47:00.646268	2025-10-24 00:47:00.646268	\N	\N	\N	simple	t	f	visible	\N	
7	86823d65-62ff-452a-9147-b56783799af9	ESMERIL ANG 4-1/2 12.000RPM 6AMP CRAFTSMAN ESM-708	33927	0	125.00	2025-10-24 00:47:00.673979	2025-10-24 00:47:00.673979	\N	\N	\N	simple	t	f	visible	\N	
8	85035fc5-519e-49f8-a665-710139c63613	ESMERIL ANG 4 1/2 820W G720 ESM-714 BLACK&amp;DECKER	23105	2	76.00	2025-10-24 00:47:00.695352	2025-10-24 00:47:00.695352	\N	\N	\N	simple	t	f	visible	\N	
9	42022dda-d5c0-424e-9762-96fdc5b74f5c	TALADRO 3/8 PERC VVR 600W DEWALT-DWD014 TAL-705	20766	2	189.00	2025-10-24 00:47:00.732829	2025-10-24 00:47:00.732829	\N	\N	\N	simple	t	f	visible	\N	
10	0035c27f-9b09-4fc7-9cde-4fdcdbcce6d6	WC ONE PIECE RIMINI ES BLANCO EF	25855	1	288.00	2025-10-24 00:47:00.752882	2025-10-24 00:47:00.752882	\N	\N	\N	simple	t	f	visible	\N	
11	158cdff0-55f2-4614-830a-47396d6e6e79	PISTOLA AIRE CAL 1500W PROMAKER	32475	4	92.00	2025-10-24 00:47:00.773121	2025-10-24 00:47:00.773121	\N	\N	\N	simple	t	f	visible	\N	
12	98a7c318-08c3-490f-a786-8d5462aa0d7f	TALADRO 1/2 600W PERC C/ACC ENERGY TOOLS ID13K	34640	0	52.00	2025-10-24 00:47:00.79399	2025-10-24 00:47:00.79399	\N	\N	\N	simple	t	f	visible	\N	
13	18482d1e-755a-4778-a8e2-814c21f40cc1	SIERRA CAL 420W KS501 BLACK&amp;DECKER SIE-703	31464	2	92.00	2025-10-24 00:47:00.813795	2025-10-24 00:47:00.813795	\N	\N	\N	simple	t	f	visible	\N	
14	0d43c209-6df9-4de0-8658-7c7d1fa3cf26	ESMERIL ANG 4 1/2 750W 11000RPM ESM-703 DEWALT-DWE4010-B3	20563	1	220.00	2025-10-24 00:47:00.837762	2025-10-24 00:47:00.837762	\N	\N	\N	simple	t	f	visible	\N	
15	93fc2ef0-7530-4793-ae12-70f1bf542686	LLAVE LAV MONOMANDO PLAST/CROM BPL-2801 MET-ALEADOS	26804	5	10.00	2025-10-24 00:47:00.860006	2025-10-24 00:47:00.860006	\N	\N	\N	simple	t	f	visible	\N	
16	e1d50cd4-2a6a-440e-8bd3-dac624c68eee	TALADRO 3/8 (10MM) PERC 550W TP550B3 BLACK&amp;DECKER TAL-701	22925	3	68.00	2025-10-24 00:47:00.881603	2025-10-24 00:47:00.881603	\N	\N	\N	simple	t	f	visible	\N	
17	016e1e91-509b-49a6-89f2-ac4c9447ae27	TALADRO 1/2 PERC 650W DWD024-B3 DEWALT	20784	2	257.00	2025-10-24 00:47:00.908161	2025-10-24 00:47:00.908161	\N	\N	\N	simple	t	f	visible	\N	
18	c1c090df-746f-43ee-bbdb-74f698886cb6	SIERRA CIRC 7-1/4 DWE560-B3 DEWALT SIE-702	20767	2	391.00	2025-10-24 00:47:00.936149	2025-10-24 00:47:00.936149	\N	\N	\N	simple	t	f	visible	\N	
19	af518cb5-e3c7-4f19-ad44-64cd6e438889	SIERRA CAL 660W BLACK&amp;DECKER	31469	2	128.00	2025-10-24 00:47:00.955489	2025-10-24 00:47:00.955489	\N	\N	\N	simple	t	f	visible	\N	
20	adb5417b-1b60-46ba-9565-a9727c48c5ce	SISTEMA PRESURIZACION AUTOM DG PED  1.5HP 230V 60-DGPED515HP PEDROLLO	28521	3	1499.00	2025-10-24 00:47:00.974829	2025-10-24 00:47:00.974829	\N	\N	\N	simple	t	f	visible	\N	
21	84b6da7d-d5c4-4545-9773-a97b8367de72	PESO DIGITAL 300KG C/GANCHO	24079	0	92.00	2025-10-24 00:47:00.99355	2025-10-24 00:47:00.99355	\N	\N	\N	simple	t	f	visible	\N	
22	9c1423f7-098c-43a3-9deb-7c5a38f89b8b	PESO DIGITAL 200KG 8088	24283	0	38.00	2025-10-24 00:47:01.012887	2025-10-24 00:47:01.012887	\N	\N	\N	simple	t	f	visible	\N	
23	5cee8aba-69bb-4953-afd2-89e77dc27b8f	BALANZA GRAMERA 3000GR 4X4	24149	3	28.00	2025-10-24 00:47:01.035162	2025-10-24 00:47:01.035162	\N	\N	\N	simple	t	f	visible	\N	
24	3f459aca-e39d-4c83-838d-1aeba8d48347	BALANZA DIGITAL 40KG COMPUTING SCALE	24081	0	66.00	2025-10-24 00:47:01.062033	2025-10-24 00:47:01.062033	\N	\N	\N	simple	t	f	visible	\N	
25	d25319a1-5199-465e-aab7-22cb12d9343b	MECHA 6MM PUNTA DIAMANTE TITANIUM REDDEVILES (VIDRIO/CERAM/MAD/CONC)	24089	0	2.00	2025-10-24 00:47:01.100103	2025-10-24 00:47:01.100103	\N	\N	\N	simple	t	f	visible	\N	
26	540d7907-677c-4c52-b89e-fc881703689d	MECHA 8MM PUNTA DIAMANTE TITANIUM REDDEVILES (VIDRIO/CERAM/MAD/CONC)	24091	0	3.00	2025-10-24 00:47:01.120128	2025-10-24 00:47:01.120128	\N	\N	\N	simple	t	f	visible	\N	
27	dc9a8da2-470b-4165-9cd0-29c3b140a740	MINI COMPRESOR INFLADOR 300PSI 12V AIR COMPRESEsSOR	24076	1	18.00	2025-10-24 00:47:01.140862	2025-10-24 00:47:01.140862	\N	\N	\N	simple	t	f	visible	\N	
28	439f9ca5-de70-46b2-9f72-2ec5bd2cedf6	MECHA 12MM PUNTA DIAMANTE (VIDRIO/CERAM/MAD/CONC) GLASS DRILL	24104	0	4.00	2025-10-24 00:47:01.159083	2025-10-24 00:47:01.159083	\N	\N	\N	simple	t	f	visible	\N	
29	8c636039-6dd1-40d2-8021-a89bd701e692	METILAN 50GR PAP/TAPIZ  METILAN PLUS	22102	133	3.00	2025-10-24 00:47:01.178352	2025-10-24 00:47:01.178352	\N	\N	\N	simple	t	f	visible	\N	
30	d80a2da4-fda7-4eb7-b278-ad26d8e6fedc	METILAN 120GR P/TAPIZ  METILAN PLUS	27810	78	6.00	2025-10-24 00:47:01.214864	2025-10-24 00:47:01.214864	\N	\N	\N	simple	t	f	visible	\N	
31	149b2593-8b54-4f9e-84b1-1c5f49301388	METILAN 500GR P/TAPIZ  METILAN PLUS	27811	36	20.00	2025-10-24 00:47:01.239261	2025-10-24 00:47:01.239261	\N	\N	\N	simple	t	f	visible	\N	
32	ec8b26bf-0d3e-4f32-99f4-126fd6eb5884	BOMBONA P/SOLDAR 400G COWPLANDT	24188	1	16.00	2025-10-24 00:47:01.259197	2025-10-24 00:47:01.259197	\N	\N	\N	simple	t	f	visible	\N	
33	7a8fb140-6a10-46e9-aec9-7e4143b61970	HIDROLIMP 1400W 1377PSI BELLOTA HID102	26299	2	215.00	2025-10-24 00:47:01.277894	2025-10-24 00:47:01.277894	\N	\N	\N	simple	t	f	visible	\N	
34	988f9765-38a9-4fac-917e-d40e8accacd7	PALIN MINERO S/CABO 5402-10 BELLOTA PAL49	34657	11	11.00	2025-10-24 00:47:01.31746	2025-10-24 00:47:01.31746	\N	\N	\N	simple	t	f	visible	\N	
35	cb42d776-7133-4d31-9f85-b60a77e53751	CUCHILLA GUADAÑAD PESAD 352425 BELLOTA CUC92	28231	53	4.00	2025-10-24 00:47:01.336536	2025-10-24 00:47:01.336536	\N	\N	\N	simple	t	f	visible	\N	
36	d8548bd1-4076-4d11-9d17-2f99d6d6b3f3	DISCO DIAMANT 4 1/2 CONTI TAURO PT-1045 DIS1011	20886	12	4.00	2025-10-24 00:47:01.355181	2025-10-24 00:47:01.355181	\N	\N	\N	simple	t	f	visible	\N	
37	79fd9af3-8526-4f6f-aaf0-07af8fee0c8a	TERRAGRES HEXAGONAL VERGRES 21.5X24.7 0.80M2/CJ  (VERDE)	10914	0	25.00	2025-10-24 00:47:01.373644	2025-10-24 00:47:01.373644	\N	\N	\N	simple	t	f	visible	\N	
38	dc1d47e0-5066-4b2b-b393-e58e9f8bdd53	TERRAGRES HEXAGONAL CAFEGRES 21.5X24.7 0.80M2/CJ  (CAFE)	10910	0	25.00	2025-10-24 00:47:01.39209	2025-10-24 00:47:01.39209	\N	\N	\N	simple	t	f	visible	\N	
39	c63c9990-b390-4173-96ea-2c66fa21f69b	TERRAGRES HEXAGONAL ARENAGRES 21.5X24.7 0.80M2/CJ  (ARENA)	10909	39	25.00	2025-10-24 00:47:01.412187	2025-10-24 00:47:01.412187	\N	\N	\N	simple	t	f	visible	\N	
40	21798b64-eccb-4e41-8643-3810303a322d	TERRAGRES HEXAGONAL GRIGRES 21.5X24.7 0.80M2/CJ  (GRIS)	10916	0	25.00	2025-10-24 00:47:01.430582	2025-10-24 00:47:01.430582	\N	\N	\N	simple	t	f	visible	\N	
41	448454f1-6b75-4b6e-ac61-d8c10c2d1e8b	CAICO LARA 26X26 1RA 1.08M2/CJ	27254	272	17.00	2025-10-24 00:47:01.447544	2025-10-24 00:47:01.447544	\N	\N	\N	simple	t	f	visible	\N	
42	ee7f1db2-fcac-4c67-ab96-98d1e1d98324	LAVAMANOS EURO S/P NEGRO MATE	26954	1	97.00	2025-10-24 00:47:01.466935	2025-10-24 00:47:01.466935	\N	\N	\N	simple	t	f	visible	\N	
43	d9f5c622-4203-4035-8a9e-c2e413d34fb6	DADO 1/4-1/2 JGO 108PZ C/RACH 10804 Q-TECH	34013	2	493.00	2025-10-24 00:47:01.486469	2025-10-24 00:47:01.486469	\N	\N	\N	simple	t	f	visible	\N	
44	dc7c6559-7e53-40ec-bb29-5920950cfbd3	CARRETILLA 75L R/MACIZA  RUTEL GUERRERA PROA035	21779	1	103.00	2025-10-24 00:47:01.504716	2025-10-24 00:47:01.504716	\N	\N	\N	simple	t	f	visible	\N	
45	5e108e05-000d-417a-bbd9-4cbeb468625f	CARRETON CONCRETERO 160LT R/SEMINEU 14" 1001030 RUTEL	33776	0	244.00	2025-10-24 00:47:01.524863	2025-10-24 00:47:01.524863	\N	\N	\N	simple	t	f	visible	\N	
46	a31b51ce-4a97-4926-ad83-bc27578ff811	BOMBA AGUA  1/2HP PERIF GENPAR GBP-050-A	28519	0	54.00	2025-10-24 00:47:01.543838	2025-10-24 00:47:01.543838	\N	\N	\N	simple	t	f	visible	\N	
47	668fdedb-b040-4786-aaa2-1adc50030e0c	MOTOR DIESEL 7HP EJE 1" GDE-070-305-MS1 GENPAR	28963	1	887.00	2025-10-24 00:47:01.564531	2025-10-24 00:47:01.564531	\N	\N	\N	simple	t	f	visible	\N	
48	9d2a3d0a-6c12-4a43-bf0a-8a145850e98d	MOTOR DIESEL 5HP EJE 1" GDE-050-247-MS1 GENPAR	26464	0	546.00	2025-10-24 00:47:01.586995	2025-10-24 00:47:01.586995	\N	\N	\N	simple	t	f	visible	\N	
49	98d7a0c1-cb98-42e2-822a-e59f6c7fcf03	MOTOR DIESEL 10HP EJE 1" GDE-100-418-MS1 GENPAR	34101	0	623.00	2025-10-24 00:47:01.606641	2025-10-24 00:47:01.606641	\N	\N	\N	simple	t	f	visible	\N	
50	6a90bfbb-fac0-487b-b75d-7aa580a40d25	HIDRONEUMAT 80GL 1HP GENPAR GPH-080-100-P	26282	0	678.00	2025-10-24 00:47:01.624981	2025-10-24 00:47:01.624981	\N	\N	\N	simple	t	f	visible	\N	
51	db70a84f-cf04-4757-ae95-49b462de7d0c	HIDROLIMP 2700PSI 7HP GASOL 2RUED GENPAR GPW-2700-AP-2W	23050	1	551.00	2025-10-24 00:47:01.645716	2025-10-24 00:47:01.645716	\N	\N	\N	simple	t	f	visible	\N	
52	81fc7905-a2a5-4033-a0e5-bb6d97838b54	FILTRO P/AGUA PRINCIPAL AZUL 20X4,5" NPT 1" GENPAR 124-20	33771	1	72.00	2025-10-24 00:47:01.665274	2025-10-24 00:47:01.665274	\N	\N	\N	simple	t	f	visible	\N	
53	1cd19117-3bc7-4b3c-af0d-23931f53889b	FILTRO FRP AZUL 2.5" 08X35" C/LLAVE MANUAL 3 POSICIONES GENPAR 0835	28595	1	157.00	2025-10-24 00:47:01.684112	2025-10-24 00:47:01.684112	\N	\N	\N	simple	t	f	visible	\N	
54	029dd185-4279-4d8e-88f4-338a4a8e0cbe	DESMALEZAD 52CC GASOL CUCH/NYL 2T TIPU U GENPAR GBC-052-2T	24446	0	213.00	2025-10-24 00:47:01.703256	2025-10-24 00:47:01.703256	\N	\N	\N	simple	t	f	visible	\N	
55	59914aba-2a4a-4325-a247-27651a20ede3	CORTAGRAMA 20" 3.5HP 4T GLM-150-020-4WM GENPAR	20002	1	420.00	2025-10-24 00:47:01.73977	2025-10-24 00:47:01.73977	\N	\N	\N	simple	t	f	visible	\N	
56	e85bb507-861c-46da-b7d4-6b2d0430b93b	BOMBA AGUA  2HP P/PISCINA 220V GBP-200 PIS GENPAR	34100	0	501.00	2025-10-24 00:47:01.757083	2025-10-24 00:47:01.757083	\N	\N	\N	simple	t	f	visible	\N	
57	b90525f1-bf7f-41f8-afb3-5fd345a2c29e	FLEXIMANTO IMPERMEABILIZANTE BLANCO 1G SUPER A	39264	14	26.00	2025-10-24 00:47:01.775197	2025-10-24 00:47:01.775197	\N	\N	\N	simple	t	f	visible	\N	
58	161ec528-1f79-42e5-90c6-fc933fcf25d6	FLEXIMANTO IMPERMEABILIZANTE ROJO 1G SUPER A	39260	20	24.00	2025-10-24 00:47:01.792019	2025-10-24 00:47:01.792019	\N	\N	\N	simple	t	f	visible	\N	
59	1d44493b-cc67-43a2-b920-dd1e787a7c9a	FLEXIMANTO IMPERMEABILIZANTE VERDE 1G SUPER A	39263	25	24.00	2025-10-24 00:47:01.811219	2025-10-24 00:47:01.811219	\N	\N	\N	simple	t	f	visible	\N	
60	d868b1ca-4f6e-46b6-9bf0-f4a441cb9ff2	FLEXIMANTO IMPERMEABILIZANTE BLANCO CÑ 5G SUPER A	39259	9	134.00	2025-10-24 00:47:01.833271	2025-10-24 00:47:01.833271	\N	\N	\N	simple	t	f	visible	\N	
61	ffde7c7b-683f-4b51-8dba-c2c643495c3a	FLEXIMANTO IMPERMEABILIZANTE GRIS CUÑ 5G SUPER A	39267	4	134.00	2025-10-24 00:47:01.850641	2025-10-24 00:47:01.850641	\N	\N	\N	simple	t	f	visible	\N	
62	56fdfc83-3b11-469f-8269-bc900de73a2d	FLEXIMANTO IMPERMEABILIZANTE VERDE CUÑ 5G SUPER A	39265	12	119.00	2025-10-24 00:47:01.871244	2025-10-24 00:47:01.871244	\N	\N	\N	simple	t	f	visible	\N	
63	11cdb964-5cbd-4bb9-aa40-aaaec8dd5bb0	WALL PANEL 1.20X3MTS AN-1119 NEGRO	31124	0	47.00	2025-10-24 00:47:01.889905	2025-10-24 00:47:01.889905	\N	\N	\N	simple	t	f	visible	\N	
64	a8fa6942-2209-4777-bf02-d10862f92ff3	WALL PANEL 3D 70X77CM 3MM AH-003	31127	50	47.00	2025-10-24 00:47:01.907107	2025-10-24 00:47:01.907107	\N	\N	\N	simple	t	f	visible	\N	
65	35cc8b73-56c1-4833-b0d8-081d37728626	WALL PANEL 1.20X3MTS AN-1119 BLANCO	31125	0	47.00	2025-10-24 00:47:01.923837	2025-10-24 00:47:01.923837	\N	\N	\N	simple	t	f	visible	\N	
66	53081a76-c4d6-4180-95f3-f0422215e924	LAMP PANEL LED 18W 85-277V CUAD DUAL HAMMER DW0303	25212	183	6.00	2025-10-24 00:47:01.94128	2025-10-24 00:47:01.94128	\N	\N	\N	simple	t	f	visible	\N	
67	e50052f6-61c0-4780-872f-29a3ba1ee23f	LAMP PANEL LED 18W 85-277V RED DUAL HAMMER DW0302	20991	88	4.00	2025-10-24 00:47:01.961095	2025-10-24 00:47:01.961095	\N	\N	\N	simple	t	f	visible	\N	
68	21ef9aae-f016-48a3-9524-8b35b2c51f9b	LAMP PANEL LED 24W 85-277V RED DUAL HAMMER DW0301	20997	213	7.00	2025-10-24 00:47:01.980713	2025-10-24 00:47:01.980713	\N	\N	\N	simple	t	f	visible	\N	
69	ba29ea90-22f9-44f0-8ba2-d9ebbea1e54a	LAMP PANEL LED 24W 85-277V CUAD DUAL HAMMER DW0304	25211	214	11.00	2025-10-24 00:47:02.01331	2025-10-24 00:47:02.01331	\N	\N	\N	simple	t	f	visible	\N	
70	d3d556c5-4cc9-4343-8460-f2530c2cd4c9	KIT HIDROCOMPACTO GKH-05L	25970	0	64.00	2025-10-24 00:47:02.035249	2025-10-24 00:47:02.035249	\N	\N	\N	simple	t	f	visible	\N	
71	0c327ed6-feae-4516-9e5e-105b30c18552	DESTORN JGO 6PZ PALA/ESTRIA PRO-DS293 PROMAK	22641	8	20.00	2025-10-24 00:47:02.054645	2025-10-24 00:47:02.054645	\N	\N	\N	simple	t	f	visible	\N	
72	dcced3c5-ca6b-4f44-b571-2391cf7c08cc	SIERRA CAL 600W 65MM PRO-SC600 PROMAKER	23128	1	139.00	2025-10-24 00:47:02.072615	2025-10-24 00:47:02.072615	\N	\N	\N	simple	t	f	visible	\N	
73	2e9e16cf-e004-4e79-9ce4-15be0f5bbf7e	CINTA MET 5MTSX3/4 PRO-CT512 PROMAKER	24246	9	10.00	2025-10-24 00:47:02.090563	2025-10-24 00:47:02.090563	\N	\N	\N	simple	t	f	visible	\N	
74	fa72bd72-2ad2-4200-9923-34363142a9e1	CORTA TODO EXACTO RETRACTIL PRO-CU110 PROMAKER	24364	1	11.00	2025-10-24 00:47:02.119713	2025-10-24 00:47:02.119713	\N	\N	\N	simple	t	f	visible	\N	
75	114f08a4-b765-4efb-8da2-5e95f56c51b7	TIJERA HOJALAT 10" PRO-TJ304 PROMAKER	24927	2	19.00	2025-10-24 00:47:02.145621	2025-10-24 00:47:02.145621	\N	\N	\N	simple	t	f	visible	\N	
76	e93c4035-8846-45cd-987d-c877c02a450f	DESTORN JGO 10PZ PLANO/ESTRIA PRO-DS294 PROMAKER	26033	3	34.00	2025-10-24 00:47:02.169092	2025-10-24 00:47:02.169092	\N	\N	\N	simple	t	f	visible	\N	
77	1e4fa81d-5c13-4780-bdbb-9879561ce481	ESMERIL DE BANCO 6" 120V 250W 3400RPM PRO-EB250 PROMAKER	27406	1	171.00	2025-10-24 00:47:02.191162	2025-10-24 00:47:02.191162	\N	\N	\N	simple	t	f	visible	\N	
78	cf17325f-87ee-4d87-98ce-8dbcc84141fa	MECHA P/CONC 5/32 PRO-DRIL025320 PROMAKER	28270	7	3.00	2025-10-24 00:47:02.206838	2025-10-24 00:47:02.206838	\N	\N	\N	simple	t	f	visible	\N	
79	eaa5bc04-7748-485e-95b0-bdae00913900	ENGRAPADORA ECON/METAL TRAB LIV PRO-EG232	28274	3	26.00	2025-10-24 00:47:02.224755	2025-10-24 00:47:02.224755	\N	\N	\N	simple	t	f	visible	\N	
80	357caeac-0443-4e13-8755-b58ac04862ae	ALICATE ELECT  8" C/FORR PRO-AL156 PROMAK	28518	14	10.00	2025-10-24 00:47:02.245305	2025-10-24 00:47:02.245305	\N	\N	\N	simple	t	f	visible	\N	
81	074172b9-2661-4bab-b217-c62d43d8ace4	ALICATE MECAN 8" COMB C/FORRO PRO-AL008	29620	3	8.00	2025-10-24 00:47:02.266747	2025-10-24 00:47:02.266747	\N	\N	\N	simple	t	f	visible	\N	
82	8a751b16-8d6a-4788-b4e3-ea1ddd91dae7	TIJERA AVIACION 10" C/RECT PRO-TJ406 PROMAKER	29641	3	16.00	2025-10-24 00:47:02.306352	2025-10-24 00:47:02.306352	\N	\N	\N	simple	t	f	visible	\N	
83	86f1b9ca-5514-4e0b-9b44-daf8b6eb4e4d	MARTILLO BOLA MECA 16OZ PRO-MT115	31284	1	9.00	2025-10-24 00:47:02.336008	2025-10-24 00:47:02.336008	\N	\N	\N	simple	t	f	visible	\N	
84	57f590b3-463b-4104-afe0-b12e725b3f2e	CUCHILLA P/AFEITA 10PZA UN SOLO FILO NIKATO NIK-2210H	31296	2	1.00	2025-10-24 00:47:02.358358	2025-10-24 00:47:02.358358	\N	\N	\N	simple	t	f	visible	\N	
85	8bb308cb-7cad-4672-938d-e71ef32cf222	DESTORN 6 EN 1 C/PUNTAS INTERCAMB PRO-DS586	29988	2	9.00	2025-10-24 00:47:02.385385	2025-10-24 00:47:02.385385	\N	\N	\N	simple	t	f	visible	\N	
86	7c9a5b1d-f877-478e-9bde-f62d39b79582	CORTA TODO EXACTO RETYRACT 3POS PRO-CU106 PROMAK	31297	8	5.00	2025-10-24 00:47:02.412687	2025-10-24 00:47:02.412687	\N	\N	\N	simple	t	f	visible	\N	
87	4e3161cc-4b8e-42c1-a017-6be141b265eb	DESTORN PALA 5/16X6 M/PLAST NIKATO NIK-221-03	30291	5	2.00	2025-10-24 00:47:02.43732	2025-10-24 00:47:02.43732	\N	\N	\N	simple	t	f	visible	\N	
88	8f3738d7-5907-437d-abf6-9fa0d6b9e0ad	CUCHILLA P/EXACTO 4"X18MM REPUESTO 10 PZA NIKATO NIK-18T-10	31406	2	1.00	2025-10-24 00:47:02.458912	2025-10-24 00:47:02.458912	\N	\N	\N	simple	t	f	visible	\N	
89	fa956d24-2135-4e09-a2b1-c054569d8bf6	ALICATE PRES 7" CURVO PRO-AL472 PROMAKER	30292	12	10.00	2025-10-24 00:47:02.483141	2025-10-24 00:47:02.483141	\N	\N	\N	simple	t	f	visible	\N	
90	d3d0d1a2-086d-41d5-b5e3-f11e37cc25c2	DESTORNILLADOR PLANO 3/16"X 4" PRO-DS208 PROMAKER	31438	0	3.00	2025-10-24 00:47:02.506726	2025-10-24 00:47:02.506726	\N	\N	\N	simple	t	f	visible	\N	
91	b8ffa820-71b6-4298-8f4c-30f3227b89d8	TRONZADORA 14" 2400W 3600RPM C/ACC PRO-TZ2400	31570	0	355.00	2025-10-24 00:47:02.524386	2025-10-24 00:47:02.524386	\N	\N	\N	simple	t	f	visible	\N	
92	a1f32982-8d41-41fa-aee2-6e4196333b4b	CINTA MET 5MTSX3/4 PRO-CT616 PROMAKER	30293	22	8.00	2025-10-24 00:47:02.541444	2025-10-24 00:47:02.541444	\N	\N	\N	simple	t	f	visible	\N	
93	999b5f9c-08dd-4ad6-9d52-68eb3db7681c	SILICON TRANSP 50G PROFESIO NIKATO NIK-S20950	31654	31	2.00	2025-10-24 00:47:02.562966	2025-10-24 00:47:02.562966	\N	\N	\N	simple	t	f	visible	\N	
94	882b730f-bd04-410f-8520-c63f9b73fb34	MARTILLO CARP 20OZ M/MAD PRO-MT208 PROMAK	31699	0	10.00	2025-10-24 00:47:02.580561	2025-10-24 00:47:02.580561	\N	\N	\N	simple	t	f	visible	\N	
95	bc5f2a0a-1cc3-4809-9127-5c6ccb4a9762	DESTORN TORX JGO 4PZ PRO-DS295	32363	2	18.00	2025-10-24 00:47:02.599094	2025-10-24 00:47:02.599094	\N	\N	\N	simple	t	f	visible	\N	
96	ce7bdda4-b2c2-4b73-9e5c-598a9bab7c2a	ALICATE JGO 3PZ ELECT C/DIAG PINZA PRO-AL502	32372	0	33.00	2025-10-24 00:47:02.616258	2025-10-24 00:47:02.616258	\N	\N	\N	simple	t	f	visible	\N	
97	da3390da-ef43-412f-8b75-362af5297060	ESMERIL ANG 4 1/2 750W 11000RPM PRO-ES750	32476	7	57.00	2025-10-24 00:47:02.641377	2025-10-24 00:47:02.641377	\N	\N	\N	simple	t	f	visible	\N	
98	5284187e-afda-4e06-9e30-ca6b96e8c604	DISCO CORT 14X3/32X1 H/A PROMAKER  ABRA051400	32578	1	7.00	2025-10-24 00:47:02.664476	2025-10-24 00:47:02.664476	\N	\N	\N	simple	t	f	visible	\N	
99	33e770f5-8a6b-41e8-8fb6-f88e8808dff5	DISCO DIAMANT 7 TURBO PROMAKER DIAM027000	33002	4	17.00	2025-10-24 00:47:02.687028	2025-10-24 00:47:02.687028	\N	\N	\N	simple	t	f	visible	\N	
100	301b9cbd-af39-4984-b914-ca1915e6ea20	DESTORN PALA 1/4" X 6" PRO-DS125 PROMAKER	33144	4	2.00	2025-10-24 00:47:02.70842	2025-10-24 00:47:02.70842	\N	\N	\N	simple	t	f	visible	\N	
101	c4e11ff0-e810-4c55-9871-4517abf57528	CINTA MET 3MTSX1/2 POWERLOCK PRO-CT511 PROMAKER	33389	3	7.00	2025-10-24 00:47:02.729017	2025-10-24 00:47:02.729017	\N	\N	\N	simple	t	f	visible	\N	
102	afb5c560-b30a-4b2b-a20d-9d2b1c3ed226	DADO 1/2X18MM NIKATO NIK-76-410	33392	4	2.00	2025-10-24 00:47:02.749214	2025-10-24 00:47:02.749214	\N	\N	\N	simple	t	f	visible	\N	
103	ac115a30-1aca-4320-8956-a1af7915eb1f	DADO 1/2X9MM NIKATO NIK-76-401	33393	3	1.00	2025-10-24 00:47:02.769018	2025-10-24 00:47:02.769018	\N	\N	\N	simple	t	f	visible	\N	
104	0babea11-103a-4740-9b8d-79b1b9138f04	DISCO CORT 4 1/2X3/64X7/8 ULTRAFINO PRO-ABRA014120	33459	215	1.00	2025-10-24 00:47:02.787023	2025-10-24 00:47:02.787023	\N	\N	\N	simple	t	f	visible	\N	
105	13700f1c-74fa-4d8b-a503-c3ff879f3f7d	DESTORN ESTRIA 1X4 PRO-DS228 PROMAKER	33509	3	2.00	2025-10-24 00:47:02.810754	2025-10-24 00:47:02.810754	\N	\N	\N	simple	t	f	visible	\N	
106	d3c58b21-db22-4758-a950-3bf6d7afa1c2	PINZA 6" C/LATERAL PTA FINA PRO-AL001	33639	3	9.00	2025-10-24 00:47:02.831653	2025-10-24 00:47:02.831653	\N	\N	\N	simple	t	f	visible	\N	
107	7117f87f-c6f7-40d6-9c87-cd572e583d28	MULTIHERRAMIENTAS 12 EN 1 M/METAL PRO-AL561	33658	0	19.00	2025-10-24 00:47:02.873796	2025-10-24 00:47:02.873796	\N	\N	\N	simple	t	f	visible	\N	
108	9eed00c4-86ad-426c-80bb-3136a42634cd	COMPRESOR  50LTS 2HP PROMAKER PRO-CP50	33666	0	448.00	2025-10-24 00:47:02.896654	2025-10-24 00:47:02.896654	\N	\N	\N	simple	t	f	visible	\N	
109	13c12ec6-9833-4e37-a5ed-58ed3df494d5	ARCO SEGUETA AJUSTB 8-12" PRO-AS108 PRO-AS108	33691	7	8.00	2025-10-24 00:47:02.921041	2025-10-24 00:47:02.921041	\N	\N	\N	simple	t	f	visible	\N	
110	b5e73590-1147-454f-a6af-7db63557b7be	ESLINGA 2"X1500KG NIKATO NIK-CL200	33796	3	24.00	2025-10-24 00:47:02.944214	2025-10-24 00:47:02.944214	\N	\N	\N	simple	t	f	visible	\N	
111	667e0aae-3642-4728-9aba-9393771ea111	ALICATE PTA FINA CORT LATER 8" C/FORRO PRO-AL002	33925	2	10.00	2025-10-24 00:47:02.965757	2025-10-24 00:47:02.965757	\N	\N	\N	simple	t	f	visible	\N	
112	7bc57b01-637f-488f-aa81-109de5e6813b	DESTORN JGO 06PZ PAL/EST  DS191 PROMAKER	33991	5	12.00	2025-10-24 00:47:02.992266	2025-10-24 00:47:02.992266	\N	\N	\N	simple	t	f	visible	\N	
113	1f0089cd-c9c3-4245-945d-74cbbf2003d5	DESTORN JGO 02PZ PAL/EST DS190 PROMAKER	33992	12	4.00	2025-10-24 00:47:03.01206	2025-10-24 00:47:03.01206	\N	\N	\N	simple	t	f	visible	\N	
114	57a14372-c9b5-44a8-aa1b-296aaf28cf55	PINT CANCHA BLANCO CUÑ 4G SUPER A	22353	3	114.00	2025-10-24 00:47:03.033409	2025-10-24 00:47:03.033409	\N	\N	\N	simple	t	f	visible	\N	
115	71ea9c1b-e6e1-49b5-999c-4cbadb1ec216	PINT CANCHA AZUL CUÑ 4G SUPER A	27659	5	93.00	2025-10-24 00:47:03.049153	2025-10-24 00:47:03.049153	\N	\N	\N	simple	t	f	visible	\N	
116	0d7769ec-158c-4459-b414-8c197bf59953	PINT P/MANTO ROJO 1GL SUPER A	28251	8	20.00	2025-10-24 00:47:03.064676	2025-10-24 00:47:03.064676	\N	\N	\N	simple	t	f	visible	\N	
117	627fa219-e8ad-4119-98f2-8f7835d55da6	PINT P/MANTO ROJO CUÑ 4G SUPER A	30518	8	80.00	2025-10-24 00:47:03.08161	2025-10-24 00:47:03.08161	\N	\N	\N	simple	t	f	visible	\N	
118	2a836116-50b5-489a-82b7-a15250b45d8c	PINT TRAFIC BLANCO N/REFLECT B/AGUA 1G SUPER A	30523	6	29.00	2025-10-24 00:47:03.098405	2025-10-24 00:47:03.098405	\N	\N	\N	simple	t	f	visible	\N	
119	aa9e1a8c-cf50-4de5-be73-8effe116b01a	PINT CANCHA GRIS 1G SUPER A	30820	18	25.00	2025-10-24 00:47:03.115078	2025-10-24 00:47:03.115078	\N	\N	\N	simple	t	f	visible	\N	
120	2a439388-078b-4564-8d1f-2f2eb2970905	TELA D/REFUERZO IMPERM 1.10X50MTS SUPER A x METRO	35558	637	1.00	2025-10-24 00:47:03.130862	2025-10-24 00:47:03.130862	\N	\N	\N	simple	t	f	visible	\N	
121	0b4eda1e-b0df-499e-9eef-04b14e50f4fb	ADITIVO IMPERMEABILIZANTE LIQUIDO SUPER A 80 1 GAL	38120	0	23.00	2025-10-24 00:47:03.147257	2025-10-24 00:47:03.147257	\N	\N	\N	simple	t	f	visible	\N	
122	f6b6e404-76d1-4755-804c-89ee59581cac	ADITIVO LIQUIDO P/CONCRE PEG MORTERO FRIZO SUPER A LATEX 1GL	38140	5	19.00	2025-10-24 00:47:03.162879	2025-10-24 00:47:03.162879	\N	\N	\N	simple	t	f	visible	\N	
123	a241f799-8708-4cce-b10f-7b40e0fb0725	REMOVEDOR CEMENTO 1GL SUPER A	38155	4	27.00	2025-10-24 00:47:03.178245	2025-10-24 00:47:03.178245	\N	\N	\N	simple	t	f	visible	\N	
124	96079643-23e8-4a2a-b366-e55861535be9	PINT CANCHA ROJO CUÑ 4G SUPER A	39012	2	82.00	2025-10-24 00:47:03.193743	2025-10-24 00:47:03.193743	\N	\N	\N	simple	t	f	visible	\N	
125	c20515da-5c2e-44f6-9f38-af7cc0ac8cb8	PINT P/MANTO BLANCO 1GL SUPER A	39150	2	29.00	2025-10-24 00:47:03.21116	2025-10-24 00:47:03.21116	\N	\N	\N	simple	t	f	visible	\N	
126	d873beb9-315f-425c-a43d-0240da91de55	PINT P/MANTO VERDE 1GL SUPER A	39160	0	23.00	2025-10-24 00:47:03.228561	2025-10-24 00:47:03.228561	\N	\N	\N	simple	t	f	visible	\N	
127	b8f6cd38-4598-4fbe-b340-083935c7f49e	PINT P/MANTO BLANCO CUÑ 4G SUPER A	39170	17	99.00	2025-10-24 00:47:03.245797	2025-10-24 00:47:03.245797	\N	\N	\N	simple	t	f	visible	\N	
128	da4cc5cc-8826-4cda-8b57-dacb9ec6f68d	PINT P/MANTO VERDE CUÑ 4G SUPER A	39171	7	91.00	2025-10-24 00:47:03.264932	2025-10-24 00:47:03.264932	\N	\N	\N	simple	t	f	visible	\N	
129	72eb1b8c-9521-441f-a073-e2020121f75c	PINT ALUMINIO 1GL P/MANTO SUPER A	39175	24	33.00	2025-10-24 00:47:03.287277	2025-10-24 00:47:03.287277	\N	\N	\N	simple	t	f	visible	\N	
130	e10b2404-403f-4c7e-ab1d-8aa4ebae8d7e	PINT ALUMINIO CUÑ 5G P/MANTO SUPER A	39180	7	135.00	2025-10-24 00:47:03.306551	2025-10-24 00:47:03.306551	\N	\N	\N	simple	t	f	visible	\N	
131	17d1750d-92e0-4790-8fa2-685eaa3cef95	CEMENTO BLANCO 20 KG SACO PAPEL ARGOS CEM270	10005	0	23.00	2025-10-24 00:47:03.328936	2025-10-24 00:47:03.328936	\N	\N	\N	simple	t	f	visible	\N	
132	e84c225a-fad0-4144-af29-a08ad872032c	CEMENTO BLANCO 25KG SACO PAPEL ARGOS	10008	75	31.00	2025-10-24 00:47:03.347764	2025-10-24 00:47:03.347764	\N	\N	\N	simple	t	f	visible	\N	
133	dedadaaf-4105-4088-8056-fca9ee3e2895	TUBO CONST (3/4")X2.00MMX6 AZUL	10373	0	17.00	2025-10-24 00:47:03.367597	2025-10-24 00:47:03.367597	\N	\N	\N	simple	t	f	visible	\N	
134	1bde2c25-d968-4dc4-86ab-14bf28f86acf	TANQUE CON  900LT PLAST D/GLASS	10627	5	136.00	2025-10-24 00:47:03.388624	2025-10-24 00:47:03.388624	\N	\N	\N	simple	t	f	visible	\N	
135	fa51dbbd-35df-405f-9a79-7ebec240cebe	TANQUE CON 1100LT PLAST D/GLASS	10628	3	207.00	2025-10-24 00:47:03.425437	2025-10-24 00:47:03.425437	\N	\N	\N	simple	t	f	visible	\N	
136	bc585a52-006f-45fd-b7d2-8ab445764f60	TANQUE CON 1500LT PLAST D/GLASS	10629	8	258.00	2025-10-24 00:47:03.442081	2025-10-24 00:47:03.442081	\N	\N	\N	simple	t	f	visible	\N	
137	dc4d9b62-4a7a-4d94-9377-dc8c82219e06	TANQUE CON 2000LT PLAST D/GLASS	10630	1	391.00	2025-10-24 00:47:03.459115	2025-10-24 00:47:03.459115	\N	\N	\N	simple	t	f	visible	\N	
138	4f356e24-1a16-4841-bf38-1eefde15fc37	TANQUE CON  600LT PLAST D/GLASS	10631	17	113.00	2025-10-24 00:47:03.47853	2025-10-24 00:47:03.47853	\N	\N	\N	simple	t	f	visible	\N	
139	ef1f1fdf-e6ff-4a21-8faf-8df7afd2b4b4	TANQUE CON 3000LT PLAST D/GLASS	10830	2	480.00	2025-10-24 00:47:03.494844	2025-10-24 00:47:03.494844	\N	\N	\N	simple	t	f	visible	\N	
140	369596e2-6630-4509-b43a-c1a1c1e40924	TUBO CONST (1/2)X2.50MMX6MTS NARANJA	10915	0	16.00	2025-10-24 00:47:03.510419	2025-10-24 00:47:03.510419	\N	\N	\N	simple	t	f	visible	\N	
141	49ed212d-c594-416f-a9e2-94a5e977cce7	CANILLA P/HIDRONEUM METAL 60CMS DOMOSA 25-ML60	21944	8	17.00	2025-10-24 00:47:03.527282	2025-10-24 00:47:03.527282	\N	\N	\N	simple	t	f	visible	\N	
142	e55e0862-ec44-4d0d-b38d-2642a8a5c445	MOTOBOMB DIESEL ALTA PRES 3X3 9.3HP 9-2020HCD-F DOMOSA	22178	0	1491.00	2025-10-24 00:47:03.544429	2025-10-24 00:47:03.544429	\N	\N	\N	simple	t	f	visible	\N	
143	c9b66f78-7dde-4759-8677-6216a8d0e8d6	CERROJO LLAVE/LLAVE COVO JM-102B-S/S	22666	11	14.00	2025-10-24 00:47:03.566484	2025-10-24 00:47:03.566484	\N	\N	\N	simple	t	f	visible	\N	
144	13c0f8b0-7672-4f52-92b6-4389a136f79e	RAMPLUG MARIPOSA 3/8X3" COVO CV-TB-3-8-3 9281	22941	22	3.00	2025-10-24 00:47:03.583695	2025-10-24 00:47:03.583695	\N	\N	\N	simple	t	f	visible	\N	
145	2bab3dc3-d3ce-4582-9bd5-5a5720269617	ESPUMA EXPANSIVA 300ML SPRAY COVO CV-MPD300 9229	23130	0	4.00	2025-10-24 00:47:03.604384	2025-10-24 00:47:03.604384	\N	\N	\N	simple	t	f	visible	\N	
146	566f9b40-d2f1-4905-ac7a-36e811e5d3b8	BOMBA CENT 2HP MONOF 230V DOMOSA 25-DC-200	24424	0	324.00	2025-10-24 00:47:03.621935	2025-10-24 00:47:03.621935	\N	\N	\N	simple	t	f	visible	\N	
147	892bdd0d-3090-493a-acbb-fa8f29c89360	BOMBA CENT 3HP MONOF DOMOSA 25-DC-300	24449	3	431.00	2025-10-24 00:47:03.6381	2025-10-24 00:47:03.6381	\N	\N	\N	simple	t	f	visible	\N	
148	c177d164-52b2-4472-9e06-a4cf7af28d55	COMPRESOR 2HP 220V-100 DOMOSA 29-C100/20MH 100LTS	24500	0	985.00	2025-10-24 00:47:03.656085	2025-10-24 00:47:03.656085	\N	\N	\N	simple	t	f	visible	\N	
149	a040c223-1cad-4271-8f75-cb2cec833a59	CAUTIN 60W 110V TROEN A136-J002-60 9039	25415	1	3.00	2025-10-24 00:47:03.671609	2025-10-24 00:47:03.671609	\N	\N	\N	simple	t	f	visible	\N	
150	c5313ef5-4fce-4a4d-aa10-c057118564d3	VASTAGO DUCHA CERAMICO 1/2 CT-WA009-10 10225 GRIVEN	26005	22	10.00	2025-10-24 00:47:03.687039	2025-10-24 00:47:03.687039	\N	\N	\N	simple	t	f	visible	\N	
151	bc196995-6f74-4605-9c68-4d75fe9f895d	PRESOSTATO P/BOMBA AGUA 20/40PSI GRIVEN 6344 A136-FSG-2	26933	8	6.00	2025-10-24 00:47:03.693523	2025-10-24 00:47:03.693523	\N	\N	\N	simple	t	f	visible	\N	
152	c4ec3f07-95e2-4464-81dd-e240bbc5c662	BOMBA SUMERGIBLE 3HP 4'' 230V 25-DS-300-19 DOMOSA	27770	3	559.00	2025-10-24 00:47:03.712202	2025-10-24 00:47:03.712202	\N	\N	\N	simple	t	f	visible	\N	
153	010efe19-b6d5-4f3e-b54f-120cfc9cd4e4	BOMBA SUMERGIBLE 2HP 4'' 230V 25-DS-200-8 DOMOSA	28172	2	469.00	2025-10-24 00:47:03.728116	2025-10-24 00:47:03.728116	\N	\N	\N	simple	t	f	visible	\N	
154	67b89ccd-ecc3-4eb7-983a-c976c7a2c3d7	LENTE P/SOLDAR AUTOMATICO COVO CV-WG-1 9045	28297	0	12.00	2025-10-24 00:47:03.74437	2025-10-24 00:47:03.74437	\N	\N	\N	simple	t	f	visible	\N	
155	159a6315-192d-4996-afc0-5fe4426145a5	CINTA PVC NEGRO 4"X60 GRIVEN A136-T10015-B 8913	28622	58	2.00	2025-10-24 00:47:03.761508	2025-10-24 00:47:03.761508	\N	\N	\N	simple	t	f	visible	\N	
156	da83a520-5c2f-485a-90c8-462c01d9bc75	LENTE SEG TRANSP CUAD COVO CV-GA-01C 8360	29112	34	1.00	2025-10-24 00:47:03.776984	2025-10-24 00:47:03.776984	\N	\N	\N	simple	t	f	visible	\N	
157	17590201-f32d-48b1-994b-42b094e2b336	MEZCLADOR GASOL DOMOSA 13HP 360LTS 31-401058 SIVETI	31432	0	2686.00	2025-10-24 00:47:03.793456	2025-10-24 00:47:03.793456	\N	\N	\N	simple	t	f	visible	\N	
158	bb41ef8f-cae2-4d44-a25f-e9443ce59d34	BOMBA SUMERGIBLE 2HP P/ACHIQUE 220V 25-DSP-200 DOMOSA	32400	0	402.00	2025-10-24 00:47:03.808546	2025-10-24 00:47:03.808546	\N	\N	\N	simple	t	f	visible	\N	
159	13b44610-3d01-452c-b2cb-822ab0f7b313	TUBO CONST (1")X2.00mmX6m AZUL	11293	8	20.00	2025-10-24 00:47:03.823789	2025-10-24 00:47:03.823789	\N	\N	\N	simple	t	f	visible	\N	
160	56018bcf-41b9-4d89-a9cc-120680ba30ee	TUBO CONST (1 1/2")X2.50X6MT NARANJA	11457	9	36.00	2025-10-24 00:47:03.838635	2025-10-24 00:47:03.838635	\N	\N	\N	simple	t	f	visible	\N	
161	5f3628e7-088c-4fe4-b9e4-66bbe4f5cf16	TANQUE HORIZONT 1000LT  D/GLAS	11349	1	477.00	2025-10-24 00:47:03.854724	2025-10-24 00:47:03.854724	\N	\N	\N	simple	t	f	visible	\N	
162	68fab02b-765f-4f61-9653-ca6e65a19c46	TANQUE HORIZONT  500LT  D/GLASS	11350	1	322.00	2025-10-24 00:47:03.870883	2025-10-24 00:47:03.870883	\N	\N	\N	simple	t	f	visible	\N	
163	ae699b5e-228a-4e54-923f-8d31cee3e20b	TANQUE HORIZONT 1500LT D/GLAS	11383	2	726.00	2025-10-24 00:47:03.887508	2025-10-24 00:47:03.887508	\N	\N	\N	simple	t	f	visible	\N	
164	860edff6-2524-4afc-b8a4-69eb902d57f9	TANQUE HORIZONT 2000LT D/GLAS	11389	1	944.00	2025-10-24 00:47:03.920893	2025-10-24 00:47:03.920893	\N	\N	\N	simple	t	f	visible	\N	
165	9c24fd0c-13fb-448e-a6e9-a5da62c0895a	TANQUE HORIZONT 3000LT D/GLASS	11460	1	1238.00	2025-10-24 00:47:03.938039	2025-10-24 00:47:03.938039	\N	\N	\N	simple	t	f	visible	\N	
166	71ff14da-286d-4574-b7ba-f97c8f091158	VASTAGO DUCHA CERAMICO 1/2 GRIVEN CT-WA025 10223	11920	6	5.00	2025-10-24 00:47:03.95371	2025-10-24 00:47:03.95371	\N	\N	\N	simple	t	f	visible	\N	
167	1b06663c-2fa0-4b28-bc4f-4eea17756bb9	PULMON PRESSCONTROL P/BOMBA DE AGUA GRIVEN A145-9YT-1 7512	20026	0	40.00	2025-10-24 00:47:03.970927	2025-10-24 00:47:03.970927	\N	\N	\N	simple	t	f	visible	\N	
168	d095a09a-03eb-4a19-a440-4cd1185685ca	PROTECTOR SUPERVIS TRF 220V GST-R220P EXCELINE	33323	0	50.00	2025-10-24 00:47:03.987074	2025-10-24 00:47:03.987074	\N	\N	\N	simple	t	f	visible	\N	
169	8477b6c2-5f1b-4739-99a6-c7f27a0e09c9	LENTE SEG TRANSP COVO CV-GA-02 10070	33328	88	3.00	2025-10-24 00:47:04.004158	2025-10-24 00:47:04.004158	\N	\N	\N	simple	t	f	visible	\N	
170	7a298524-7c06-467f-b739-aa1eeac7109c	BOMBA HIDROCOMP 1HP 20LTS 1X1 25-HC-7520 DOMOSA	33449	2	243.00	2025-10-24 00:47:04.020169	2025-10-24 00:47:04.020169	\N	\N	\N	simple	t	f	visible	\N	
171	a530adb3-be6a-4d02-a980-97fe1f52fc0f	BOMBA SUMERGIBLE  1.5HP 4" 6ET 220V  25-DS-150-6 DOMOSA	33514	3	427.00	2025-10-24 00:47:04.036291	2025-10-24 00:47:04.036291	\N	\N	\N	simple	t	f	visible	\N	
172	708e62d0-a7f7-4aec-b768-03be0b7883ef	MOTOBOMB DIESEL ALTA PRES 2X2 7HP 9-2015HCD-F DOMOSA	33611	0	1206.00	2025-10-24 00:47:04.052131	2025-10-24 00:47:04.052131	\N	\N	\N	simple	t	f	visible	\N	
173	c442ea4a-75f2-4c6e-9915-c0a5128788a7	MOTOSIERRA PROFESIONAL 22" 54CC 2T GASOLINA 83-PS58-22 DOMOSA	33792	10	240.00	2025-10-24 00:47:04.067698	2025-10-24 00:47:04.067698	\N	\N	\N	simple	t	f	visible	\N	
174	d61aecc1-bfc0-4978-9dcb-9d4a720add90	FUMIGADOR D/ESPALDA 12LT MOT 2T 33-DFP-12-2T DOMOSA	33808	0	350.00	2025-10-24 00:47:04.087538	2025-10-24 00:47:04.087538	\N	\N	\N	simple	t	f	visible	\N	
175	2f3ea702-0419-46d1-82e8-ab7cce1e783f	BOMBA CENT 1.5HP 220V 25-DC-150 DOMOSA	33942	0	298.00	2025-10-24 00:47:04.103077	2025-10-24 00:47:04.103077	\N	\N	\N	simple	t	f	visible	\N	
176	0f14e80a-1ae0-4b33-bc63-5a6674917bdc	DESMALEZAD 52CC GASOL DOMOSA 83-BC-5200 CUCH-NYL	34102	12	202.00	2025-10-24 00:47:04.118066	2025-10-24 00:47:04.118066	\N	\N	\N	simple	t	f	visible	\N	
177	8b00baaa-89d1-4ae7-8627-6490379f80a5	BOMBA SUMERGIBLE 1HP 4" 220V 7-ET 25-DS-100-7 DOMOSA	34257	2	355.00	2025-10-24 00:47:04.135416	2025-10-24 00:47:04.135416	\N	\N	\N	simple	t	f	visible	\N	
178	b54f9737-5dd7-4e05-9fcf-e1a72d2c0e3d	BOMBA AGUA  1/2HP PERF 1X1" 25-DPX-70 DOMOSA	34489	2	81.00	2025-10-24 00:47:04.150868	2025-10-24 00:47:04.150868	\N	\N	\N	simple	t	f	visible	\N	
179	cccf08e2-9828-4cb9-aa9c-f685e8599077	MANOMETRO DE PRESION 0-170 PSI 1/4" GRIVEN GV-ZW-WC50-S 10882	34999	5	4.00	2025-10-24 00:47:04.166134	2025-10-24 00:47:04.166134	\N	\N	\N	simple	t	f	visible	\N	
180	07784ce7-5b39-467d-802d-2fb449b1966e	CINTA PVC BLANCO 4"X60 GRIVEN A136-T10015-W 8915	35839	13	2.00	2025-10-24 00:47:04.180962	2025-10-24 00:47:04.180962	\N	\N	\N	simple	t	f	visible	\N	
181	43eab991-4f0a-49d7-9e7b-8bc7ce179e31	CAUTIN 40W TROEN BG-40W 7441	35846	11	3.00	2025-10-24 00:47:04.195999	2025-10-24 00:47:04.195999	\N	\N	\N	simple	t	f	visible	\N	
182	02218271-12db-4fc0-ace2-537e31f1484c	FLOTADOR VALVULA 1" P/TANQUE GRIVEN A367-JYN25 9728	35854	51	8.00	2025-10-24 00:47:04.213975	2025-10-24 00:47:04.213975	\N	\N	\N	simple	t	f	visible	\N	
183	14f9abcc-9e5b-4665-986d-51d4774cb8a4	LLAVE ARREST 3 VIAS 1/2X1/2X1/2 GRIVEN SHA-001 9290	35859	14	2.00	2025-10-24 00:47:04.229218	2025-10-24 00:47:04.229218	\N	\N	\N	simple	t	f	visible	\N	
184	796cb5e5-bc04-43c5-87ad-8b80b2c447fa	LENTE P/SOLDAR AUTOMATICO COVO CV-WG-2 12065	20233	0	16.00	2025-10-24 00:47:04.244512	2025-10-24 00:47:04.244512	\N	\N	\N	simple	t	f	visible	\N	
185	490ca709-eb96-46fe-b51e-475d55a069bd	BOMBA CENT 1HP 25-DC-100 110/220V DOMOSA	20290	0	207.00	2025-10-24 00:47:04.263886	2025-10-24 00:47:04.263886	\N	\N	\N	simple	t	f	visible	\N	
186	9abbf104-16d6-4e68-ba21-adf1bbd55614	GUANTES ALGODON R/NITRILO COVO CV-GL-7 10062	20299	11	3.00	2025-10-24 00:47:04.279038	2025-10-24 00:47:04.279038	\N	\N	\N	simple	t	f	visible	\N	
187	c88fb330-ec8e-4841-8cb8-b47b85c7b238	DESTORN 2PZA ESTR/PALA COVO CV-SH-403 9049	20722	6	3.00	2025-10-24 00:47:04.295615	2025-10-24 00:47:04.295615	\N	\N	\N	simple	t	f	visible	\N	
188	4a3d97c0-6269-4966-9acc-ea61e1ee8042	PINZA P/SOLD P/ELECT 500A COVO CV-R-500A 10167	20900	4	13.00	2025-10-24 00:47:04.31251	2025-10-24 00:47:04.31251	\N	\N	\N	simple	t	f	visible	\N	
189	79f6fad6-a367-4393-a9ff-7fb7e69d34fa	DISCO ESM 4 1/2 MET LIJA GRNO 80 FLAP COVO CV-FD115-80 8658	21016	67	1.00	2025-10-24 00:47:04.330576	2025-10-24 00:47:04.330576	\N	\N	\N	simple	t	f	visible	\N	
190	9da06127-5b3d-45d2-9768-52432fb75476	DADO 1/2 JGO 12PZ C/RACH COVO CV-SWS12-1-2-MM 10810	21809	0	36.00	2025-10-24 00:47:04.348842	2025-10-24 00:47:04.348842	\N	\N	\N	simple	t	f	visible	\N	
191	735a3dfe-3caf-4aa5-8373-2b8924d56864	LLAVE COMB 6PZ COVO CV-CWH0106 9487	21845	2	24.00	2025-10-24 00:47:04.365362	2025-10-24 00:47:04.365362	\N	\N	\N	simple	t	f	visible	\N	
192	65be5263-7a18-42b8-baa9-b9115662f178	ANGULO H.NEGRO  30X30X3MMX6MTS LAM/FRIO VERDE	10025	187	14.00	2025-10-24 00:47:04.381358	2025-10-24 00:47:04.381358	\N	\N	\N	simple	t	f	visible	\N	
193	83cea82a-49a7-41e0-9e32-ac0e20848e2a	TUBO RECT 180X65X4.00mmx12mt	10141	38	334.00	2025-10-24 00:47:04.397038	2025-10-24 00:47:04.397038	\N	\N	\N	simple	t	f	visible	\N	
194	dc65a4bb-3b22-40e1-9636-d92ff74e2645	ANGULO H.NEGRO  20X20X 2.5MM 6M LAM/FRIO	10149	0	8.00	2025-10-24 00:47:04.412525	2025-10-24 00:47:04.412525	\N	\N	\N	simple	t	f	visible	\N	
195	999fa766-1665-4760-90d7-9a2cf91a9919	ANGULO H.NEGRO  25X25X3MMX 6M  AZUL	10191	115	12.00	2025-10-24 00:47:04.446934	2025-10-24 00:47:04.446934	\N	\N	\N	simple	t	f	visible	\N	
196	63156f02-c3ca-4ea5-b7f5-323f2311f3b2	ANGULO H.NEGRO  20X20X3MM X 6M  BLANCO	10238	61	10.00	2025-10-24 00:47:04.463618	2025-10-24 00:47:04.463618	\N	\N	\N	simple	t	f	visible	\N	
197	9c0ba14a-e3f4-4f9a-a02f-878daec29cfc	ANGULO H.NEGRO  30X30X3MM X 6M AMARILL	10240	70	14.00	2025-10-24 00:47:04.479842	2025-10-24 00:47:04.479842	\N	\N	\N	simple	t	f	visible	\N	
198	82a8edd7-feb4-4ea9-80c0-33f147dbae39	ANGULO H.NEGRO  40X40X4MM X 6M NEGRO	10242	0	25.00	2025-10-24 00:47:04.496076	2025-10-24 00:47:04.496076	\N	\N	\N	simple	t	f	visible	\N	
199	03845236-1566-4109-b71c-49b967e2a6d8	ANGULO H.NEGRO  50X50X5MM X6M GRIS	10247	0	40.00	2025-10-24 00:47:04.51235	2025-10-24 00:47:04.51235	\N	\N	\N	simple	t	f	visible	\N	
200	95fc9e59-7540-4f0b-99b9-b16915b30499	ANGULO H.NEGRO  65X65X5MMX12M GRIS	10249	16	101.00	2025-10-24 00:47:04.527073	2025-10-24 00:47:04.527073	\N	\N	\N	simple	t	f	visible	\N	
201	0fa219dc-e129-4b38-a0bb-fa52070d3466	ANGULO H.NEGRO  65X65X6MM X6MT **VERDE	10250	0	97.00	2025-10-24 00:47:04.541694	2025-10-24 00:47:04.541694	\N	\N	\N	simple	t	f	visible	\N	
202	d75ffb60-876f-4293-9a41-eb3cf440d320	ANGULO H.NEGRO  65X65X6MM X12M VERDE	10251	1	120.00	2025-10-24 00:47:04.55738	2025-10-24 00:47:04.55738	\N	\N	\N	simple	t	f	visible	\N	
203	63c9f810-a478-4c84-a715-c19c0aaa3031	ANGULO H.NEGRO  65X65X7MM X12M ROSADO	10252	48	139.00	2025-10-24 00:47:04.576307	2025-10-24 00:47:04.576307	\N	\N	\N	simple	t	f	visible	\N	
204	3999dde8-465a-4ba7-81d1-a53b8fefb44f	ANGULO H.NEGRO  90X90X7MM X12M ROSADO	10256	0	374.00	2025-10-24 00:47:04.591105	2025-10-24 00:47:04.591105	\N	\N	\N	simple	t	f	visible	\N	
205	b6f2b0e1-e358-4d44-9ec2-e98df9d805d6	ANGULO H.NEGRO 100X100X08MMX12 NEGRO	10257	70	248.00	2025-10-24 00:47:04.606284	2025-10-24 00:47:04.606284	\N	\N	\N	simple	t	f	visible	\N	
206	2893bd42-f84f-487d-9698-c054b60fcafd	ANGULO H.NEGRO 100X100X10MMX12 BLANCO	10258	61	306.00	2025-10-24 00:47:04.620755	2025-10-24 00:47:04.620755	\N	\N	\N	simple	t	f	visible	\N	
207	d6971dcc-5428-4e9c-b6ff-365398b50c06	TUBO RECT 80X40X2.20MM 12mt (ROJO)	10272	0	110.00	2025-10-24 00:47:04.635213	2025-10-24 00:47:04.635213	\N	\N	\N	simple	t	f	visible	\N	
208	7be9d253-ae50-4487-9f23-d4d177dd25e6	TUBO RECT 80X40X3.00MM 12mt	10274	0	138.00	2025-10-24 00:47:04.650159	2025-10-24 00:47:04.650159	\N	\N	\N	simple	t	f	visible	\N	
209	e0b76807-e25a-48cf-84c4-8628c2fc2635	TUBO RECT 1X1/2X6MX0.90MM   BLANCO	10286	82	7.00	2025-10-24 00:47:04.665218	2025-10-24 00:47:04.665218	\N	\N	\N	simple	t	f	visible	\N	
210	c4ff94a3-79b0-4c51-b200-5ddec2fd37ab	TUBO RECT 1-1/2X1/2X6MX0.90MM  BLANCO	10288	90	9.00	2025-10-24 00:47:04.679437	2025-10-24 00:47:04.679437	\N	\N	\N	simple	t	f	visible	\N	
211	3f52c88b-4fc1-4204-a815-d57e8bc80009	TUBO RECT 1-1/2X1X6MX0.90MM    BLANCO	10293	69	11.00	2025-10-24 00:47:04.696668	2025-10-24 00:47:04.696668	\N	\N	\N	simple	t	f	visible	\N	
212	6cae7e6e-be40-4db1-9ba6-7c31490a6fdb	TUBO RECT 2X1X0.90X6MTS BLANCO	10294	5	13.00	2025-10-24 00:47:04.713037	2025-10-24 00:47:04.713037	\N	\N	\N	simple	t	f	visible	\N	
213	81ea97b2-ac3d-4326-aa64-e876c68b46ab	TUBO RECT 2X1X6MX1.00MM MORADO	10295	0	15.00	2025-10-24 00:47:04.72798	2025-10-24 00:47:04.72798	\N	\N	\N	simple	t	f	visible	\N	
214	b6c01c65-4488-4be9-a727-f9396f528838	TUBO RECT 2X1X6MX2MM   AZUL	10296	32	29.00	2025-10-24 00:47:04.742485	2025-10-24 00:47:04.742485	\N	\N	\N	simple	t	f	visible	\N	
215	c19ae3ff-da75-411f-9766-98f85e558b29	TUBO RECT 3X1X6M1.10mm         NARANJA	10304	0	32.00	2025-10-24 00:47:04.757419	2025-10-24 00:47:04.757419	\N	\N	\N	simple	t	f	visible	\N	
216	1138a3a0-554e-4e7b-8d31-b213a1a32ae9	TUBO RECT 3X1X6M 1.00MM     MORADO	10305	22	20.00	2025-10-24 00:47:04.772991	2025-10-24 00:47:04.772991	\N	\N	\N	simple	t	f	visible	\N	
217	5603c072-833b-4e8a-97d8-ca17be7b9554	TUBO RECT 3X1-1/2X6MX 1.00MM   NEGRO	10309	0	25.00	2025-10-24 00:47:04.78864	2025-10-24 00:47:04.78864	\N	\N	\N	simple	t	f	visible	\N	
218	dd605139-ffb4-48d6-bdb6-eedc22be3b31	TUBO RECT 2-1/2X1-1/2X1.50MMX6MTS ROSADO	10311	54	30.00	2025-10-24 00:47:04.804524	2025-10-24 00:47:04.804524	\N	\N	\N	simple	t	f	visible	\N	
219	3d120d10-596f-4615-8226-e633ba04d7bd	TUBO RECT 2X1X6MX0.85MM NARANJA	10316	216	12.00	2025-10-24 00:47:04.820327	2025-10-24 00:47:04.820327	\N	\N	\N	simple	t	f	visible	\N	
220	2be65a08-491c-41bb-a322-cd9909bfdb8f	TUBO RECT 2-1/2X1-1/2X1.20MMX6MTS NEGRO	10321	0	25.00	2025-10-24 00:47:04.838038	2025-10-24 00:47:04.838038	\N	\N	\N	simple	t	f	visible	\N	
221	2b86d0bb-2ec3-447e-b3d0-3442e9e2211f	TUBO RECT 100X40X2.20MM X12MT NEGRO	10327	0	129.00	2025-10-24 00:47:04.853618	2025-10-24 00:47:04.853618	\N	\N	\N	simple	t	f	visible	\N	
222	760b33a4-7b23-4164-a8ea-7610b985c6ee	TUBO RECT 300X100X5,5MMX12MTS	10346	0	963.00	2025-10-24 00:47:04.869354	2025-10-24 00:47:04.869354	\N	\N	\N	simple	t	f	visible	\N	
223	d8ba9bf0-09d3-4f71-98d8-df560d8c691b	TUBO RECT 120X60X3.00MM  12MTS	10350	0	195.00	2025-10-24 00:47:04.887122	2025-10-24 00:47:04.887122	\N	\N	\N	simple	t	f	visible	\N	
224	b2edcce4-fb9a-4c48-878b-ff40a9a43eac	TUBO RECT 140X60X3.00MM  12MTS	10351	15	218.00	2025-10-24 00:47:04.903372	2025-10-24 00:47:04.903372	\N	\N	\N	simple	t	f	visible	\N	
225	da258595-ce63-4b6d-8924-417c12b2371e	TUBO RECT 3X1-1/2X6MX 2.25mm VERDE	10386	0	54.00	2025-10-24 00:47:04.920844	2025-10-24 00:47:04.920844	\N	\N	\N	simple	t	f	visible	\N	
226	e2fbb38f-ffab-4e15-a1b6-c3305f81dafc	TUBO RECT 3X1-1/2X6MX 2.00MM AZUL	10506	24	45.00	2025-10-24 00:47:04.9386	2025-10-24 00:47:04.9386	\N	\N	\N	simple	t	f	visible	\N	
227	68ad94ce-e5c3-4823-a9f3-cf80d04174c1	TUBO RECT 2-1/2X1-1/2X0,90mm X6MTS	10822	11	18.00	2025-10-24 00:47:04.974083	2025-10-24 00:47:04.974083	\N	\N	\N	simple	t	f	visible	\N	
228	f17e9c0c-8177-46ae-ab90-519d4a44346d	TUBO RECT 2-1/2X1-1/2X1.00mm X6MTS MORADO	10823	48	20.00	2025-10-24 00:47:04.989042	2025-10-24 00:47:04.989042	\N	\N	\N	simple	t	f	visible	\N	
372	f3ce0c05-ce60-4556-884f-c50e6db7462f	PINT OLEO BRILL ROSADO 1/4 SOLINTEX 534	26009	2	6.00	2025-10-24 00:47:07.408421	2025-10-24 00:47:07.408421	\N	\N	\N	simple	t	f	visible	\N	
229	2a35cdd9-033d-497e-b666-ed2f84de7ee7	TUBO RECT 3X1-1/2X6MX 1.20mm  NEGRO	10857	0	29.00	2025-10-24 00:47:05.003444	2025-10-24 00:47:05.003444	\N	\N	\N	simple	t	f	visible	\N	
230	78d0c1a6-fab3-4e74-9ae2-ac1b83d19532	TUBO RECT 3X1-1/2X6MX 1.90MM AMARILL	10858	0	47.00	2025-10-24 00:47:05.017964	2025-10-24 00:47:05.017964	\N	\N	\N	simple	t	f	visible	\N	
231	a90861ec-5f1c-4e6c-afa9-0a32ce23c364	TUBO RECT 260X90X5.00 X12MTS	10863	0	773.00	2025-10-24 00:47:05.033292	2025-10-24 00:47:05.033292	\N	\N	\N	simple	t	f	visible	\N	
232	5f9bef02-cbdd-437b-aff0-1d75a9b263e4	TUBO RECT 160X65X3.00 X12MTS	10864	0	270.00	2025-10-24 00:47:05.053627	2025-10-24 00:47:05.053627	\N	\N	\N	simple	t	f	visible	\N	
233	ffe85080-cb9e-4841-9710-09b0a8b0a31a	TUBO RECT 100X40X2.5mmX12MT	10867	0	131.00	2025-10-24 00:47:05.071388	2025-10-24 00:47:05.071388	\N	\N	\N	simple	t	f	visible	\N	
234	61107ff0-976d-4837-b348-e958cabb3c70	TUBO RECT 80X40X2.40MM 12MT	10893	2	109.00	2025-10-24 00:47:05.086624	2025-10-24 00:47:05.086624	\N	\N	\N	simple	t	f	visible	\N	
235	a9d2c0d1-2701-4644-8db8-772785ec5773	TUBO RECT 3X1X6M 0.90mm BLANCO	10911	0	18.00	2025-10-24 00:47:05.102152	2025-10-24 00:47:05.102152	\N	\N	\N	simple	t	f	visible	\N	
236	5b23d590-b099-4b89-9879-d41bcabd37d3	TUBO RECT 4X2X6MX2.90mm MARRON	10913	348	62.00	2025-10-24 00:47:05.119384	2025-10-24 00:47:05.119384	\N	\N	\N	simple	t	f	visible	\N	
237	0a03861b-1786-472a-8c09-22a279b6c113	TUBO RECT 100X40X3.00MMX12MTS	10922	0	152.00	2025-10-24 00:47:05.138742	2025-10-24 00:47:05.138742	\N	\N	\N	simple	t	f	visible	\N	
238	d12d530e-7568-4006-823d-4da2877bec33	ANGULO H.NEGRO  50X50X4MM X6MT **NARAN	10943	30	32.00	2025-10-24 00:47:05.154147	2025-10-24 00:47:05.154147	\N	\N	\N	simple	t	f	visible	\N	
239	3ba81319-8f28-4516-a379-992172ba64d8	ANGULO H.NEGRO  40X40X3MM X 6M ROJO	11071	0	19.00	2025-10-24 00:47:05.169848	2025-10-24 00:47:05.169848	\N	\N	\N	simple	t	f	visible	\N	
240	03c36209-35bd-4478-96d1-58dc8374cedd	TUBO RECT 2-1/2X1X6MX1.00mm   MORADO	11195	0	18.00	2025-10-24 00:47:05.186093	2025-10-24 00:47:05.186093	\N	\N	\N	simple	t	f	visible	\N	
241	f5b52200-42e3-43e3-9e32-cc1d6e92031a	TUBO RECT 120X60X2.50MMX12MT	11276	4	165.00	2025-10-24 00:47:05.201352	2025-10-24 00:47:05.201352	\N	\N	\N	simple	t	f	visible	\N	
242	3ddc8339-6668-4d99-b082-66fb70383210	TUBO RECT 140x60x2.50mmx12mt	11277	0	211.00	2025-10-24 00:47:05.216037	2025-10-24 00:47:05.216037	\N	\N	\N	simple	t	f	visible	\N	
243	b519bb03-4934-4bbc-9568-13181e382515	TUBO RECT 120x60x2.35mmx12mt	11289	0	169.00	2025-10-24 00:47:05.231044	2025-10-24 00:47:05.231044	\N	\N	\N	simple	t	f	visible	\N	
244	b3d79359-6a29-4953-aeaa-5ccb7e7342ac	TUBO RECT 1X1/2X6MX1.10MM NARANJA	11454	0	9.00	2025-10-24 00:47:05.245539	2025-10-24 00:47:05.245539	\N	\N	\N	simple	t	f	visible	\N	
245	6e90d526-db92-4aea-9bf1-f1e4456d3869	TUBO RECT 3X1-1/2X6MX 0.90mm   BLANCO	11459	110	20.00	2025-10-24 00:47:05.260445	2025-10-24 00:47:05.260445	\N	\N	\N	simple	t	f	visible	\N	
246	bf12b82a-59b0-4041-ab79-bad91efb80aa	PROTECTOR P/NEVERA ALTA GAMA 120 GSM-NG120	20298	2	39.00	2025-10-24 00:47:05.275375	2025-10-24 00:47:05.275375	\N	\N	\N	simple	t	f	visible	\N	
247	18a1a4e7-0199-4a85-9ad1-0290534527b3	BREAKER EMPOT 1X060    BTICINO TIVEN 8901/60	20880	6	12.00	2025-10-24 00:47:05.290001	2025-10-24 00:47:05.290001	\N	\N	\N	simple	t	f	visible	\N	
248	d5f329af-a474-441d-974a-e65eaf28d6d5	PROTECTOR P/COMPUTADORAS 120V GSM-PC120	21462	6	23.00	2025-10-24 00:47:05.307775	2025-10-24 00:47:05.307775	\N	\N	\N	simple	t	f	visible	\N	
249	a51a342d-2532-4258-88df-bf0b7b8440f4	PROTECTOR P/TELEVISORES GRAN FORMATO 120V GSM-TG	23035	0	38.00	2025-10-24 00:47:05.325895	2025-10-24 00:47:05.325895	\N	\N	\N	simple	t	f	visible	\N	
250	0f45e99c-9210-4cee-9128-bffab8809836	BREAKER SUPERF 1X040 BTICINO TIBRA TV1040	23650	13	13.00	2025-10-24 00:47:05.344497	2025-10-24 00:47:05.344497	\N	\N	\N	simple	t	f	visible	\N	
251	9893a103-fbeb-4034-8391-a4dcf72bcb9b	BREAKER EMPOT 1X020 BTICINO TIVEN 8901/20	23655	57	8.00	2025-10-24 00:47:05.36466	2025-10-24 00:47:05.36466	\N	\N	\N	simple	t	f	visible	\N	
252	09468680-dda9-4dd9-99ca-95402cf2f362	BREAKER EMPOT 1X030    BTICINO TIVEN 8901/30	23657	21	8.00	2025-10-24 00:47:05.381417	2025-10-24 00:47:05.381417	\N	\N	\N	simple	t	f	visible	\N	
253	2d5f5ffe-3187-47ad-8049-f187e1bdd69e	BREAKER EMPOT 1X040    BTICINO TIVEN 8901/40	23658	24	12.00	2025-10-24 00:47:05.399908	2025-10-24 00:47:05.399908	\N	\N	\N	simple	t	f	visible	\N	
254	d8538c79-ddd4-4635-ab86-b93f50df1b85	BREAKER EMPOT 2X030 GQL-30A-2 EXCELINE	23818	0	13.00	2025-10-24 00:47:05.418202	2025-10-24 00:47:05.418202	\N	\N	\N	simple	t	f	visible	\N	
255	7a046e79-cd06-48d1-8c7e-46299920e9b5	PROTECTOR ARRANCADOR P/BOMBA BORN 220V 14A 746W/2HP EXCELINE GAM-B220	24314	0	54.00	2025-10-24 00:47:05.43726	2025-10-24 00:47:05.43726	\N	\N	\N	simple	t	f	visible	\N	
256	4faba5c3-f68e-4c77-a9d1-434dfe3036c7	PROGRAMADOR HORARIO DIGITAL 120-220V GTC-B1CMV	25487	2	37.00	2025-10-24 00:47:05.455581	2025-10-24 00:47:05.455581	\N	\N	\N	simple	t	f	visible	\N	
257	285eaca1-7d96-4937-b0e7-be2f3f26a3fb	BREAKER EMPOT 2X020  BTICINO TIVEN 8902/20	27014	4	24.00	2025-10-24 00:47:05.474773	2025-10-24 00:47:05.474773	\N	\N	\N	simple	t	f	visible	\N	
258	2ed8992d-a3ab-4ebf-9f4c-79a6866ab7ad	BREAKER EMPOT 2X030 BTICINO TIVEN 8902/30	27015	12	24.00	2025-10-24 00:47:05.490318	2025-10-24 00:47:05.490318	\N	\N	\N	simple	t	f	visible	\N	
259	a6cc9288-fcc2-4439-bb71-c0009f6d9b73	BREAKER SUPERF 1X020   BTICINO TIBRA TV1020	27498	44	9.00	2025-10-24 00:47:05.524543	2025-10-24 00:47:05.524543	\N	\N	\N	simple	t	f	visible	\N	
260	fa9b3b86-d131-48cd-a0e4-65a4356cf796	BREAKER SUPERF 1X030   BTICINO TIBRA TV1030	27499	66	9.00	2025-10-24 00:47:05.540146	2025-10-24 00:47:05.540146	\N	\N	\N	simple	t	f	visible	\N	
261	463109de-00a5-4f78-8437-072146a2e968	BREAKER SUPERF 2X040 EXCELINE GQC-40A-2	27971	13	23.00	2025-10-24 00:47:05.555761	2025-10-24 00:47:05.555761	\N	\N	\N	simple	t	f	visible	\N	
262	bdd9a9cb-08e8-4735-86d1-827fa412c51c	BREAKER EMPOT 1X020 EXCELINE GQL-20A-1	28142	0	7.00	2025-10-24 00:47:05.570893	2025-10-24 00:47:05.570893	\N	\N	\N	simple	t	f	visible	\N	
263	3aa3ef76-e755-421b-9166-5aa61f26270a	PROGRAMADOR HORARIO DIGITAL 120/220V GTC-B1LMV	28359	3	42.00	2025-10-24 00:47:05.585864	2025-10-24 00:47:05.585864	\N	\N	\N	simple	t	f	visible	\N	
264	4e94298a-a549-4771-a5b3-2f304186cc9f	LLAVE LAV MONOM DORADO MATE PRI-064MG  METALES ALEADOS	28451	7	70.00	2025-10-24 00:47:05.602989	2025-10-24 00:47:05.602989	\N	\N	\N	simple	t	f	visible	\N	
265	e17e13eb-b4e9-489d-ab9e-f145ebd29c40	LLAVE FREG MONOM ORO MATE METALES ALEADOS PRI-066MG	28784	3	133.00	2025-10-24 00:47:05.619035	2025-10-24 00:47:05.619035	\N	\N	\N	simple	t	f	visible	\N	
266	79a88ed8-41f7-40d7-be58-72ddc8dc224b	BREAKER EMPOT 2X040 BTICINO TIVEN 8902/40	29371	15	29.00	2025-10-24 00:47:05.645612	2025-10-24 00:47:05.645612	\N	\N	\N	simple	t	f	visible	\N	
267	4e7712e3-c97d-42c1-bf07-6a615ba91f1d	BREAKER SUPERF 2X20 THQD220 LUMISTAR	31353	7	7.00	2025-10-24 00:47:05.663157	2025-10-24 00:47:05.663157	\N	\N	\N	simple	t	f	visible	\N	
268	e81dba49-7a5e-4bda-a217-c62b9d1cd74e	MULTITOMA 6T NEGRA RG03 LUMISTAR	31648	8	6.00	2025-10-24 00:47:05.680212	2025-10-24 00:47:05.680212	\N	\N	\N	simple	t	f	visible	\N	
269	4e764af3-c154-4569-a9ee-d78a1e361cda	BREAKER EMP 3X40  GQL-40A-3 EXCELINE	32849	5	26.00	2025-10-24 00:47:05.696402	2025-10-24 00:47:05.696402	\N	\N	\N	simple	t	f	visible	\N	
270	2ca11d76-675a-4e80-9fe1-104345068ca7	BREAKER EMPOT 1X020A THQL120 LUMISTAR	33520	45	2.00	2025-10-24 00:47:05.712077	2025-10-24 00:47:05.712077	\N	\N	\N	simple	t	f	visible	\N	
271	29ec8287-6eba-4e67-9a9f-7b939661b0b6	BREAKER EMPOT 1X030A THQL130 LUMISTAR	33521	20	2.00	2025-10-24 00:47:05.727663	2025-10-24 00:47:05.727663	\N	\N	\N	simple	t	f	visible	\N	
272	255b9884-06be-4383-9e41-ca49c8abb985	BREAKER SUPERF 2X040A THQD240 LUMISTAR	33524	12	7.00	2025-10-24 00:47:05.742257	2025-10-24 00:47:05.742257	\N	\N	\N	simple	t	f	visible	\N	
273	b92a9245-1013-49a4-b2ca-cc07eb522491	BREAKER SUPERF 3X100A THQD3100 LUMISTAR	33526	2	21.00	2025-10-24 00:47:05.756722	2025-10-24 00:47:05.756722	\N	\N	\N	simple	t	f	visible	\N	
274	69007fd4-193f-49cd-b6e6-f5e98f7c1277	BREAKER SUPERF 3X060 THQD360 LUMISTAR	33643	3	11.00	2025-10-24 00:47:05.771213	2025-10-24 00:47:05.771213	\N	\N	\N	simple	t	f	visible	\N	
275	cfd196ad-81a2-42b5-b8cf-d748d1b5d9d1	FLOTADOR VALVULA 1/2 P/TANQUE EXCELINE GVF-050-HI	33874	3	8.00	2025-10-24 00:47:05.786551	2025-10-24 00:47:05.786551	\N	\N	\N	simple	t	f	visible	\N	
276	7522aae6-7637-4324-87b6-27c45d942505	PROGRAMADOR HORARIO DIGITAL 120V GTC-B1L120S	34110	3	77.00	2025-10-24 00:47:05.802489	2025-10-24 00:47:05.802489	\N	\N	\N	simple	t	f	visible	\N	
277	2c6f36a3-c8bf-46d6-8729-e0798ffbd160	PROTECTOR AIR-ACOM/CONSOLA GSM-AS220BS 220V-EXCELINE	34446	2	24.00	2025-10-24 00:47:05.817116	2025-10-24 00:47:05.817116	\N	\N	\N	simple	t	f	visible	\N	
278	74d0666f-3549-4222-bb9d-62eae019d6d9	BREAKER EMPOT 1X030 EXCELINE GQL-30A-1	34840	1	6.00	2025-10-24 00:47:05.831855	2025-10-24 00:47:05.831855	\N	\N	\N	simple	t	f	visible	\N	
279	6a607d37-29d9-4653-b26c-4382a7d44847	BREAKER EMPOT 2X030A THQL230 LUMISTAR	34844	16	6.00	2025-10-24 00:47:05.846886	2025-10-24 00:47:05.846886	\N	\N	\N	simple	t	f	visible	\N	
280	48a0ee12-6d86-4c35-a85b-b0cda40a9ac2	PROTECTOR SUPERVIS TRF P/MOTORES 220V GST-RM220 EXCELINE	36521	8	29.00	2025-10-24 00:47:05.864106	2025-10-24 00:47:05.864106	\N	\N	\N	simple	t	f	visible	\N	
281	d3d814b4-921a-49c1-b752-d9d05085ade0	SEGUNDA TUBO RECT 2X1X0.90X6MTS	70027	12	11.00	2025-10-24 00:47:05.880276	2025-10-24 00:47:05.880276	\N	\N	\N	simple	t	f	visible	\N	
282	612ebf3e-1801-4296-96b2-04d044bdcf66	SERRUCHO 22" M/PLAST INGCO HHAS08550	25207	2	10.00	2025-10-24 00:47:05.895674	2025-10-24 00:47:05.895674	\N	\N	\N	simple	t	f	visible	\N	
283	ea0a1223-3778-49ae-82a9-79e8b3025800	BOMBA SUMERGIBLE 5.5HP 220V 4" S/CUAD ELECT GENPAR 3F GBS-4-550-40-T	26058	1	726.00	2025-10-24 00:47:05.910966	2025-10-24 00:47:05.910966	\N	\N	\N	simple	t	f	visible	\N	
284	c66f4cda-cbb8-424c-be53-5eac9fe11c41	BOMBA SUMERGIBLE 3HP 220V 4" C/CONTROL GENPAR GBS-4-300-21-M	28600	0	388.00	2025-10-24 00:47:05.92541	2025-10-24 00:47:05.92541	\N	\N	\N	simple	t	f	visible	\N	
285	cb4a0332-a4f3-45a0-a4e4-1d6ca38dd31c	DESTORN ESTRIA 2X6 M/PLAST NIK-222-10	27969	6	2.00	2025-10-24 00:47:05.939945	2025-10-24 00:47:05.939945	\N	\N	\N	simple	t	f	visible	\N	
286	7599dcb8-a325-46aa-9844-e2d8cf797e3d	ESMERIL ANG 4 1/2 670W GWS-670 BOSCH 541227	25077	0	100.00	2025-10-24 00:47:05.955519	2025-10-24 00:47:05.955519	\N	\N	\N	simple	t	f	visible	\N	
287	10dd341c-bfff-41f1-a604-04884e621d3a	CINTA MET 30MTSX125MM FIBRA/HACER INGCO HSMT8430	28050	5	13.00	2025-10-24 00:47:05.972051	2025-10-24 00:47:05.972051	\N	\N	\N	simple	t	f	visible	\N	
288	051b71e5-7991-410b-a557-2882f94b5eca	HACHA 3LBS S/C 8125-3 BELLOTA HAC02	34995	23	20.00	2025-10-24 00:47:05.990961	2025-10-24 00:47:05.990961	\N	\N	\N	simple	t	f	visible	\N	
289	fc0e0c14-0ab7-481c-a57f-299c66ad0484	LIMA ESCOFINA RAPTOR 14" S/M 4134-14 RAF BELLOTA LIM18	31961	6	51.00	2025-10-24 00:47:06.030925	2025-10-24 00:47:06.030925	\N	\N	\N	simple	t	f	visible	\N	
290	ab6f2de3-e608-4385-b26f-d3053e6dd727	CANDADO CISA CLASS 50mm	24957	1	26.00	2025-10-24 00:47:06.059575	2025-10-24 00:47:06.059575	\N	\N	\N	simple	t	f	visible	\N	
291	0546fc21-66f0-40d5-8565-c57b4e06c563	CANDADO ANTICIZALLA 90MM SECURITY	27088	0	6.00	2025-10-24 00:47:06.075099	2025-10-24 00:47:06.075099	\N	\N	\N	simple	t	f	visible	\N	
292	b3dd6f38-ba2d-4e44-a71f-a78b187c632a	PINT PLAST BLANCO CUÑ 4G SOLINTEX 105	20574	0	80.00	2025-10-24 00:47:06.091408	2025-10-24 00:47:06.091408	\N	\N	\N	simple	t	f	visible	\N	
293	35c203c5-7e1b-4bba-b92e-27945066df17	PINT PLAST BLANCO COLONIAL 1G SOLINTEX 107	20573	9	15.00	2025-10-24 00:47:06.106416	2025-10-24 00:47:06.106416	\N	\N	\N	simple	t	f	visible	\N	
294	71e1a50b-3192-4a99-81b5-6221867b0849	PINT PLAST ROSADO 1G SOLINTEX 165	20581	2	15.00	2025-10-24 00:47:06.123696	2025-10-24 00:47:06.123696	\N	\N	\N	simple	t	f	visible	\N	
295	7f83bbf5-e8ff-421f-980f-5bc2d412f15d	PINT PLAST AZUL 1G SOLINTEX 185	20582	5	15.00	2025-10-24 00:47:06.140313	2025-10-24 00:47:06.140313	\N	\N	\N	simple	t	f	visible	\N	
296	6fed01a5-f6cf-4e66-a26e-782d7aea8f33	PINT PLAST BLANCO OSTRA 1G SOLINTEX 110	20583	0	19.00	2025-10-24 00:47:06.158963	2025-10-24 00:47:06.158963	\N	\N	\N	simple	t	f	visible	\N	
297	5b491439-b091-460f-b859-ae0acdde200e	PINT PLAST BLANCO GAL SOLINTEX 105	20584	0	20.00	2025-10-24 00:47:06.179473	2025-10-24 00:47:06.179473	\N	\N	\N	simple	t	f	visible	\N	
298	fd052dcf-1230-48b1-8af7-bdec44a91eba	PINT PLAST MARFIL 1G SOLINTEX 115	20585	22	15.00	2025-10-24 00:47:06.198299	2025-10-24 00:47:06.198299	\N	\N	\N	simple	t	f	visible	\N	
299	7a80fcd3-636c-4894-92d2-b000094688bd	PINT PLAST SALMON 1G SOLINTEX 163	20586	14	15.00	2025-10-24 00:47:06.217234	2025-10-24 00:47:06.217234	\N	\N	\N	simple	t	f	visible	\N	
300	43808f47-d55e-4e30-a8b2-2ec78dad655a	PINT PLAST AZUL MEDIO GAL SOLINTEX 180	20587	0	24.00	2025-10-24 00:47:06.235325	2025-10-24 00:47:06.235325	\N	\N	\N	simple	t	f	visible	\N	
301	4a766da8-6ee9-4bb4-aa55-c75b10cedf9b	PINT PLAST DORADO GAL SOLINTEX 125	20590	6	15.00	2025-10-24 00:47:06.251457	2025-10-24 00:47:06.251457	\N	\N	\N	simple	t	f	visible	\N	
302	b0c8124c-a7db-4c96-9685-7207022c5577	PINT PLAST AMARILLO GAL SOLINTEX 130	20591	0	15.00	2025-10-24 00:47:06.267177	2025-10-24 00:47:06.267177	\N	\N	\N	simple	t	f	visible	\N	
303	7598ecb9-c2e3-4f80-864f-d2029e27c270	PINT PLAST BLANCO ORQ GAL SOLINTEX 164	20593	9	15.00	2025-10-24 00:47:06.283806	2025-10-24 00:47:06.283806	\N	\N	\N	simple	t	f	visible	\N	
304	e0f68c7c-a621-4c32-871c-c31e511a890b	PINT PLAST ROSA 1G SOLINTEX 170	20594	1	15.00	2025-10-24 00:47:06.298521	2025-10-24 00:47:06.298521	\N	\N	\N	simple	t	f	visible	\N	
305	20067a78-c57d-4839-8ac9-91bbae3c492b	PINT PLAST CELESTE 1G SOLINTEX 175	20596	0	15.00	2025-10-24 00:47:06.312709	2025-10-24 00:47:06.312709	\N	\N	\N	simple	t	f	visible	\N	
306	66c14981-d5ab-4dac-9381-08b7b45f31fc	PINT PLAST MARFIL CLASICO GAL SOLINTEX 116	20598	4	15.00	2025-10-24 00:47:06.327225	2025-10-24 00:47:06.327225	\N	\N	\N	simple	t	f	visible	\N	
307	238820d1-a277-4c7b-bbc3-a1e94d89a97d	PINT PLAST TURQUESA CARIBE 1G SOLINTEX 141	20599	5	19.00	2025-10-24 00:47:06.341057	2025-10-24 00:47:06.341057	\N	\N	\N	simple	t	f	visible	\N	
308	3a062059-01d0-4cd7-be60-634a4eef2bdb	PINT PLAST VERDE BOSQUE  1GAL SOLINTEX 146	20602	12	15.00	2025-10-24 00:47:06.354653	2025-10-24 00:47:06.354653	\N	\N	\N	simple	t	f	visible	\N	
309	7ea7d2bd-118f-4da4-aabc-86ffd3dc0eb0	PINT PLAST MARFIL RENAC 1G SOLINTEX 122	20604	3	15.00	2025-10-24 00:47:06.36917	2025-10-24 00:47:06.36917	\N	\N	\N	simple	t	f	visible	\N	
310	f7eb5700-ef6e-4c4c-aed4-f03b3701817f	PINT PLAST DORADO INTENS GAL SOLINTEX 126	20605	18	15.00	2025-10-24 00:47:06.384485	2025-10-24 00:47:06.384485	\N	\N	\N	simple	t	f	visible	\N	
311	78ed0a33-0b9f-41cf-9b65-3f80fd3492d8	PINT PLAST AZUL CAMP GAL SOLINTEX 187	20606	10	15.00	2025-10-24 00:47:06.403108	2025-10-24 00:47:06.403108	\N	\N	\N	simple	t	f	visible	\N	
312	dcf8ac44-5e15-49d8-a701-bbc0e2816ceb	PINT PLAST AZUL FIRMAMENTO 1G SOLINTEX 188	24800	1	15.00	2025-10-24 00:47:06.418538	2025-10-24 00:47:06.418538	\N	\N	\N	simple	t	f	visible	\N	
313	21759eba-9a5b-4958-ad44-8fef0a75b2b1	PINT PLAST VERDE JUNGL 1G SOLINTEX 147	24805	24	19.00	2025-10-24 00:47:06.433986	2025-10-24 00:47:06.433986	\N	\N	\N	simple	t	f	visible	\N	
314	b03ee25d-9b10-4abb-9d87-49583649b221	PINT PLAST AZUL TURQUESA 1G SOLINTEX 186	28561	3	15.00	2025-10-24 00:47:06.449079	2025-10-24 00:47:06.449079	\N	\N	\N	simple	t	f	visible	\N	
315	10873d98-abf2-4c77-9755-a2263e5b06f3	PINT PLAST GRIS INVIERNO 1GAL SOLINTEX 109	30550	7	15.00	2025-10-24 00:47:06.465292	2025-10-24 00:47:06.465292	\N	\N	\N	simple	t	f	visible	\N	
316	d0f9f55a-8ac5-418d-8a0f-e3ffb88284b3	PINT PLAST BEIGE 1 GALON SOLINTEX  123	30911	0	16.00	2025-10-24 00:47:06.481141	2025-10-24 00:47:06.481141	\N	\N	\N	simple	t	f	visible	\N	
317	b26dd2f2-1697-4393-85b4-1831b31c588f	PINT PLAST BEIGE CLASICO 1G SOLINTEX 124	35102	10	15.00	2025-10-24 00:47:06.504306	2025-10-24 00:47:06.504306	\N	\N	\N	simple	t	f	visible	\N	
318	02a0222d-f71c-40ce-b4b1-e8258af9cf95	PINT SUPER E BLANCO GAL SOLINTEX 605	20614	3	32.00	2025-10-24 00:47:06.522695	2025-10-24 00:47:06.522695	\N	\N	\N	simple	t	f	visible	\N	
319	210157af-1ce6-4a39-b1d8-894027fc5a06	PINT SUPER E NEGRO GAL SOLINTEX 680	20617	16	26.00	2025-10-24 00:47:06.537488	2025-10-24 00:47:06.537488	\N	\N	\N	simple	t	f	visible	\N	
320	4bb560f4-305f-445d-9bf3-b8395cbcd624	PINT SUPER E NEGRO MATE GAL SOLINTEX 685	20625	15	28.00	2025-10-24 00:47:06.570339	2025-10-24 00:47:06.570339	\N	\N	\N	simple	t	f	visible	\N	
321	822b5ff6-a5a1-4e08-a177-36610664212a	PINT SUPER E BLANCO MATE GAL SOLINTEX 690	20626	0	30.00	2025-10-24 00:47:06.58563	2025-10-24 00:47:06.58563	\N	\N	\N	simple	t	f	visible	\N	
322	105b7388-ad0e-4c50-8e00-4cf7713e5b3b	PINT SUPER E BLANCO 1/4G SOLINTEX 605	20631	0	8.00	2025-10-24 00:47:06.601115	2025-10-24 00:47:06.601115	\N	\N	\N	simple	t	f	visible	\N	
323	01e3a5bc-cb21-478b-8061-3d4595f8925c	PINT SUPER E NEGRO 1/4G SOLINTEX 680	20634	0	7.00	2025-10-24 00:47:06.61674	2025-10-24 00:47:06.61674	\N	\N	\N	simple	t	f	visible	\N	
324	3b9b4338-a870-40cf-8b6f-508cc81d3555	PINT SUPER E VERDE ESMER 1/4G SOLINTEX 665	20643	0	5.00	2025-10-24 00:47:06.636574	2025-10-24 00:47:06.636574	\N	\N	\N	simple	t	f	visible	\N	
325	a67f4d96-c5cc-4277-81a7-26b661fe0943	PINT SUPER E NEGRO MATE 1/4G SOLINTEX 685	20644	0	7.00	2025-10-24 00:47:06.654036	2025-10-24 00:47:06.654036	\N	\N	\N	simple	t	f	visible	\N	
326	6d8a5c38-3812-4eae-b59b-7a38fb0f587d	PINT SUPER E BLANCO MATE 1/4G SOLINTEX 690	20645	0	7.00	2025-10-24 00:47:06.672036	2025-10-24 00:47:06.672036	\N	\N	\N	simple	t	f	visible	\N	
327	628153bd-78c3-4e33-821f-6ea8f792c1e8	PINT SUPER ACRIL GREIGE PALADIO 1G (383) SOLINTEX	20254	0	31.00	2025-10-24 00:47:06.692111	2025-10-24 00:47:06.692111	\N	\N	\N	simple	t	f	visible	\N	
328	2f72ab42-c7e6-4e1a-8cf6-86f7860c521f	PINT SUPER ACRIL ROSA SUAVE 1G SOLINTEX	26781	5	28.00	2025-10-24 00:47:06.708315	2025-10-24 00:47:06.708315	\N	\N	\N	simple	t	f	visible	\N	
329	4faca793-4661-4bc3-9e25-decf79b95175	PINT SUPER ACRIL AZUL HISP 1G SOLINTEX 357	20702	7	31.00	2025-10-24 00:47:06.725792	2025-10-24 00:47:06.725792	\N	\N	\N	simple	t	f	visible	\N	
330	1b3c402f-027f-4138-8676-45b3bf50d90a	PINT SUPER ACRIL PRIMAVERA 1G SOLINTEX	20703	2	28.00	2025-10-24 00:47:06.743164	2025-10-24 00:47:06.743164	\N	\N	\N	simple	t	f	visible	\N	
331	0cc9a4bf-7a43-4f73-a342-459a8ae28d1c	PINT SUPER ACRIL ROSA IMPERIAL 1G SOLINTEX 326	26782	4	28.00	2025-10-24 00:47:06.759536	2025-10-24 00:47:06.759536	\N	\N	\N	simple	t	f	visible	\N	
332	2fdf37a8-04fd-4a15-9d94-0873b1de0118	PINT SUPER ACRIL BLANCO LINO 1G SOLINTEX	26678	0	28.00	2025-10-24 00:47:06.777803	2025-10-24 00:47:06.777803	\N	\N	\N	simple	t	f	visible	\N	
333	cd5207d8-bf98-4d91-827c-13be6724eb5b	PINT SUPER ACRIL AZUL 1G SOLINTEX	29032	0	31.00	2025-10-24 00:47:06.795195	2025-10-24 00:47:06.795195	\N	\N	\N	simple	t	f	visible	\N	
334	de53e2e5-76eb-4838-87e8-839c6fb51e17	PINT OLEO BRILL CASTAÑO 1G SOLINTEX 520	20651	10	24.00	2025-10-24 00:47:06.81044	2025-10-24 00:47:06.81044	\N	\N	\N	simple	t	f	visible	\N	
335	ee7d68ba-10e0-46da-9c4f-c4fe685d6077	PINT SUPER ACRIL VERDE ALEGRIA 1G SOLINTEX	29390	0	31.00	2025-10-24 00:47:06.824381	2025-10-24 00:47:06.824381	\N	\N	\N	simple	t	f	visible	\N	
336	e0a9bbca-aacc-44e8-8e14-3ea71ebeaeaa	PINT OLEO BRILL CELESTE 1G SOLINTEX 557	20654	7	24.00	2025-10-24 00:47:06.839239	2025-10-24 00:47:06.839239	\N	\N	\N	simple	t	f	visible	\N	
337	68947c63-0d31-4968-b192-bbcc0870d17b	PINT SUPER ACRI GRIS ONIX 1/4G SOLINTEX 380	29393	7	8.00	2025-10-24 00:47:06.856507	2025-10-24 00:47:06.856507	\N	\N	\N	simple	t	f	visible	\N	
338	10bdf117-226f-46ea-acd4-2ee7fd97be34	PINT SUPER ACRIL NEGRO 1G SOLINTEX 375	30216	0	28.00	2025-10-24 00:47:06.873848	2025-10-24 00:47:06.873848	\N	\N	\N	simple	t	f	visible	\N	
339	65510932-70dc-4d62-8339-41d573133024	PINT OLEO BRILL ROSADO 1 GAL SOLINTEX 534	27192	6	24.00	2025-10-24 00:47:06.88995	2025-10-24 00:47:06.88995	\N	\N	\N	simple	t	f	visible	\N	
340	5739cdb9-28e2-473e-977b-5cc40073b9f2	PINT SUPER ACRIL GRIS ONIX 1GAL SOLINTEX 380	30563	5	28.00	2025-10-24 00:47:06.905901	2025-10-24 00:47:06.905901	\N	\N	\N	simple	t	f	visible	\N	
341	fda09e3c-48ec-4240-8320-8877160ad4c2	PINT OLEO BRILL TURQUES 1 GAL SOLINTEX 545	27193	1	24.00	2025-10-24 00:47:06.92131	2025-10-24 00:47:06.92131	\N	\N	\N	simple	t	f	visible	\N	
342	b1632332-ab7f-4516-a734-8a8e0a957b62	PINT SUPER ACRIL GRIS PLATINO 1GAL SOLINTEX 381	30927	0	28.00	2025-10-24 00:47:06.936663	2025-10-24 00:47:06.936663	\N	\N	\N	simple	t	f	visible	\N	
343	f3836fe3-f1a6-4706-b1e7-0efa7193fd36	PINT SUPER ACRIL GREIGE AGATA 1G 382 SOLINTEX	35030	0	28.00	2025-10-24 00:47:06.952094	2025-10-24 00:47:06.952094	\N	\N	\N	simple	t	f	visible	\N	
344	66cd5959-1557-47ca-8ce0-23fff9db20fa	PINT OLEO BRILL ENCINA 1G SOLINTEX 522	28568	0	24.00	2025-10-24 00:47:06.96725	2025-10-24 00:47:06.96725	\N	\N	\N	simple	t	f	visible	\N	
345	8ad7add2-fa2d-405f-85d0-dd9c1e224882	PINT SUPER ACRIL BLANCO ANTIGUO 1G SOLINTEX 303	20691	2	28.00	2025-10-24 00:47:06.982032	2025-10-24 00:47:06.982032	\N	\N	\N	simple	t	f	visible	\N	
346	09fd4267-879a-4729-9f98-5fc06b3a3385	PINT SUPER ACRIL SALMON 1G SOLINTEX	20692	11	28.00	2025-10-24 00:47:06.995681	2025-10-24 00:47:06.995681	\N	\N	\N	simple	t	f	visible	\N	
347	d3474a3f-8128-4382-8d9d-9c11673805e4	PINT SUPER ACRIL ROJO PURO 1G SOLINTEX	20693	8	28.00	2025-10-24 00:47:07.010447	2025-10-24 00:47:07.010447	\N	\N	\N	simple	t	f	visible	\N	
348	cfa6c514-809e-4384-b27a-468a538e8f86	PINT OLEO BRILL GRIS 1 G SOLINTEX 565	35002	0	24.00	2025-10-24 00:47:07.024334	2025-10-24 00:47:07.024334	\N	\N	\N	simple	t	f	visible	\N	
349	2830fe62-6442-4fac-82d8-20e5b24c4090	PINT SUPER ACRIL GIRASOL 1G SOLINTEX 339	20697	1	28.00	2025-10-24 00:47:07.038693	2025-10-24 00:47:07.038693	\N	\N	\N	simple	t	f	visible	\N	
350	5fe790b2-7c53-42f7-80c5-353209634311	PINT SUPER ACRIL AZUL INVIERNO  1G SOLINTEX	20698	0	28.00	2025-10-24 00:47:07.053581	2025-10-24 00:47:07.053581	\N	\N	\N	simple	t	f	visible	\N	
351	fd2f4979-1754-48a7-94df-66e5825bd520	PINT SUPER ACRIL DORADO 1G SOLINTEX 345	20699	0	28.00	2025-10-24 00:47:07.06866	2025-10-24 00:47:07.06866	\N	\N	\N	simple	t	f	visible	\N	
352	6c5d3ee2-de0c-4893-b0fd-76c77089a4d4	PINT OLEO BRILL VAINILLA CLARO 1G SOLINTEX 509	35004	6	24.00	2025-10-24 00:47:07.104439	2025-10-24 00:47:07.104439	\N	\N	\N	simple	t	f	visible	\N	
353	04bffc88-8d72-4cdd-a149-d329b8ad20ba	PINT SUPER ACRIL AZUL MEDIT 1G SOLINTEX 351	20700	4	28.00	2025-10-24 00:47:07.11928	2025-10-24 00:47:07.11928	\N	\N	\N	simple	t	f	visible	\N	
354	1dbdb664-c25e-4139-bcbd-3cec03a5ee66	PINT SUPER ACRIL AZUL SERENO 1G SOLINTEX	20701	0	28.00	2025-10-24 00:47:07.134802	2025-10-24 00:47:07.134802	\N	\N	\N	simple	t	f	visible	\N	
355	a29c6d73-4b5d-4afa-b9b6-a1e998319e47	PINT OLEO BRILL GRIS CLARO 1G SOLINTEX 560	35040	0	24.00	2025-10-24 00:47:07.152857	2025-10-24 00:47:07.152857	\N	\N	\N	simple	t	f	visible	\N	
356	812c9aaf-2f0c-427e-8d0a-55d946b315c6	PINT OLEO BRILL AMARI INT 1G SOLINTEX 517	35043	0	25.00	2025-10-24 00:47:07.167899	2025-10-24 00:47:07.167899	\N	\N	\N	simple	t	f	visible	\N	
357	e84fb27e-8bfc-44fd-9126-4a977c74a26c	PINT OLEO BRILL BLANCO GAL SOLINTEX 505	35048	0	24.00	2025-10-24 00:47:07.18354	2025-10-24 00:47:07.18354	\N	\N	\N	simple	t	f	visible	\N	
358	6e2e6d59-406c-45db-92ea-34240d7b9b98	PINT OLEO BRILL VERDE MAR 1G SOLINTEX 543	21030	0	24.00	2025-10-24 00:47:07.199243	2025-10-24 00:47:07.199243	\N	\N	\N	simple	t	f	visible	\N	
359	25e73877-bc1d-4183-9ff3-e7aadf2dab58	PINT OLEO BRILL AMARI CATER/INDUST  1GL SOLINTEX 519	20887	0	24.00	2025-10-24 00:47:07.214134	2025-10-24 00:47:07.214134	\N	\N	\N	simple	t	f	visible	\N	
360	03702f3c-ea61-4c5b-8f88-7b7bc4bd6f59	PINT OLEO BRILL AZUL ATLANT 1G SOLINTEX 556	24809	0	24.00	2025-10-24 00:47:07.228121	2025-10-24 00:47:07.228121	\N	\N	\N	simple	t	f	visible	\N	
361	05fc2b53-3fab-47a2-8df5-931cfc4d12c0	PINT OLEO BRILL BLANCO OSTRA 1G SOLINTEX 506	26017	0	24.00	2025-10-24 00:47:07.242283	2025-10-24 00:47:07.242283	\N	\N	\N	simple	t	f	visible	\N	
362	ce0ea860-428d-410a-8f14-03dc9c033fe8	PINT OLEO BRILL VERDE 1 G SOLINTEX 540	26710	2	24.00	2025-10-24 00:47:07.256296	2025-10-24 00:47:07.256296	\N	\N	\N	simple	t	f	visible	\N	
363	6832d21d-4a4a-40ce-9f82-a943e3b504cd	PINT OLEO BRILL NEGRO GAL SOLINTEX 570	20711	82	24.00	2025-10-24 00:47:07.270286	2025-10-24 00:47:07.270286	\N	\N	\N	simple	t	f	visible	\N	
364	c07312e7-6b48-481a-9b54-a2dcc404e3a0	PINT OLEO BRILL ROJO FUEGO GAL SOLINTEX 532	20709	0	30.00	2025-10-24 00:47:07.2877	2025-10-24 00:47:07.2877	\N	\N	\N	simple	t	f	visible	\N	
365	826b27d5-2c37-421d-bdd1-c0d1ef0c5c79	PINT OLEO BRILL CELESTE 1/4G SOLINTEX 557	20657	7	6.00	2025-10-24 00:47:07.304806	2025-10-24 00:47:07.304806	\N	\N	\N	simple	t	f	visible	\N	
366	8881bd93-8768-41d5-8920-004212fbc174	PINT OLEO BRILL ROJO LADR 1/4G SOLINTEX 538	28569	0	6.00	2025-10-24 00:47:07.3191	2025-10-24 00:47:07.3191	\N	\N	\N	simple	t	f	visible	\N	
367	4de1630d-555b-4571-a076-ea48dc2901ae	PINT OLEO BRILL ROJO TEJA 1/4 SOLINTEX 537	24820	4	6.00	2025-10-24 00:47:07.336048	2025-10-24 00:47:07.336048	\N	\N	\N	simple	t	f	visible	\N	
368	a0e162de-07f5-4fdc-9e9a-05741538e05a	PINT OLEO BRILL AZUL MEDIO 1/4 SOLINTEX 554	24823	10	6.00	2025-10-24 00:47:07.350419	2025-10-24 00:47:07.350419	\N	\N	\N	simple	t	f	visible	\N	
369	bd64df12-0af9-4f39-b779-1b77ee91935c	PINT OLEO BRILL AMAR INTEN 1/4 SOLINTEX 517	25263	22	6.00	2025-10-24 00:47:07.364996	2025-10-24 00:47:07.364996	\N	\N	\N	simple	t	f	visible	\N	
370	1462e9ff-257a-4b9b-8717-569153bb08b1	PINT OLEO BRILL VERDE 1/4 SOLINTEX 540	25264	24	6.00	2025-10-24 00:47:07.380526	2025-10-24 00:47:07.380526	\N	\N	\N	simple	t	f	visible	\N	
371	f1d56e5d-5b37-4483-a5ec-01b1348e245e	PINT OLEO BRILL GRIS 1/4 SOLINTEX 565	26008	0	6.00	2025-10-24 00:47:07.394583	2025-10-24 00:47:07.394583	\N	\N	\N	simple	t	f	visible	\N	
373	8c3ede99-0913-4417-bcb0-4d7b9ebccbe2	PINT OLEO BRILL VERDE TILO 1/4 SOLINTEX 544	26010	0	6.00	2025-10-24 00:47:07.423091	2025-10-24 00:47:07.423091	\N	\N	\N	simple	t	f	visible	\N	
374	06344e9c-ef56-4761-a642-fecdb21b1dbd	PINT OLEO BRILL CASTAÑO 1/4 SOLINTEX 520	26018	10	6.00	2025-10-24 00:47:07.438297	2025-10-24 00:47:07.438297	\N	\N	\N	simple	t	f	visible	\N	
375	e90c1394-fa71-42e1-b4f4-52bbf9de5633	PINT OLEO BRILL GRIS CLARO 1/4 SOLINTEX 560	26098	4	6.00	2025-10-24 00:47:07.452876	2025-10-24 00:47:07.452876	\N	\N	\N	simple	t	f	visible	\N	
376	10855961-9002-4c4f-a213-a30fdbb3afc2	PINT OLEO BRILL MARFIL 1/4 SOLINTEX 510	26708	22	6.00	2025-10-24 00:47:07.477429	2025-10-24 00:47:07.477429	\N	\N	\N	simple	t	f	visible	\N	
377	0e89001a-028b-4e48-aa79-b2f2f8c028b8	PINT OLEO BRILL MARFIL CLAS 1/4 SOLINTEX 511	26709	0	6.00	2025-10-24 00:47:07.498234	2025-10-24 00:47:07.498234	\N	\N	\N	simple	t	f	visible	\N	
378	28af3679-1bde-4154-9c15-355f4e883f9e	PINT OLEO BRILL CAOBA 1/4 SOLINTEX 525	26711	0	6.00	2025-10-24 00:47:07.512466	2025-10-24 00:47:07.512466	\N	\N	\N	simple	t	f	visible	\N	
379	b3d814c2-eed0-46ef-8a6a-9c6294d0cae5	PINT OLEO BRILL VERDE MAR 1/4 SOLINTEX 543	26712	35	6.00	2025-10-24 00:47:07.526275	2025-10-24 00:47:07.526275	\N	\N	\N	simple	t	f	visible	\N	
380	3a81ca64-916e-42be-b5b6-a2c5eacf8bdb	PINT OLEO BRILL TURQUESA 1/4 SOLINTEX 545	26713	3	6.00	2025-10-24 00:47:07.539941	2025-10-24 00:47:07.539941	\N	\N	\N	simple	t	f	visible	\N	
381	ffedd201-cb2b-4d91-a5b9-1e10ca47b05d	PINT OLEO BRILL ROJO FUEGO 1/4 GAL SOLINTEX 532	20710	0	6.00	2025-10-24 00:47:07.554985	2025-10-24 00:47:07.554985	\N	\N	\N	simple	t	f	visible	\N	
382	24930b24-59f9-4c91-83c1-e93353247fca	PINT OLEO BRILL NEGRO 1/4 GAL SOLINTEX 570	20712	190	6.00	2025-10-24 00:47:07.570506	2025-10-24 00:47:07.570506	\N	\N	\N	simple	t	f	visible	\N	
383	dafb1411-7fda-498e-a811-9041723bd92c	PINT OLEO BRILL ENCINA 1/4 SOLINTEX 522	28567	3	6.00	2025-10-24 00:47:07.585348	2025-10-24 00:47:07.585348	\N	\N	\N	simple	t	f	visible	\N	
384	9a878bd5-cdb1-4869-a68b-38dd69def2be	BARNIZ CAOBA OSCURO 1/4 GAL SOLINTEX 415	26002	0	6.00	2025-10-24 00:47:07.618865	2025-10-24 00:47:07.618865	\N	\N	\N	simple	t	f	visible	\N	
385	2ca6f761-5027-4b38-aa07-2c91215d4b05	BARNIZ CAOBA CLARO 1/4 GAL SOLINTEX 410	20668	0	6.00	2025-10-24 00:47:07.635876	2025-10-24 00:47:07.635876	\N	\N	\N	simple	t	f	visible	\N	
386	c8895c32-7b04-4fb7-88ef-55c5a002ca84	BARNIZ CAOBA CLASICO 1/4 GAL SOLINTEX 418	20669	0	7.00	2025-10-24 00:47:07.652317	2025-10-24 00:47:07.652317	\N	\N	\N	simple	t	f	visible	\N	
387	1000fbe7-17c4-4417-a533-c3210b9f51d2	BARNIZ TRANSP BRILL 1/4 GAL SOLINTEX 405	20667	0	6.00	2025-10-24 00:47:07.669096	2025-10-24 00:47:07.669096	\N	\N	\N	simple	t	f	visible	\N	
388	9db19938-b370-4e13-aff4-5ee28eacb772	BARNIZ CAOBA OSCURO 1 GALON SOLINTEX 415	26003	0	23.00	2025-10-24 00:47:07.688693	2025-10-24 00:47:07.688693	\N	\N	\N	simple	t	f	visible	\N	
389	a8f4dad6-7c0c-472e-85b8-df777176cd61	BARNIZ CAOBA CLARO 1 GALON SOLINTEX 410	26004	13	23.00	2025-10-24 00:47:07.707175	2025-10-24 00:47:07.707175	\N	\N	\N	simple	t	f	visible	\N	
390	14ccd7d8-5501-433e-98ed-d690f5ebef3e	BARNIZ CAOBA CLASICO 1 GALON SOLINTEX 418	25111	7	27.00	2025-10-24 00:47:07.722437	2025-10-24 00:47:07.722437	\N	\N	\N	simple	t	f	visible	\N	
391	f85b401a-a08a-4969-a410-c7c6d0ee54f9	BARNIZ TRANSP BRILL 1 GALON SOLINTEX 405	20665	0	23.00	2025-10-24 00:47:07.73729	2025-10-24 00:47:07.73729	\N	\N	\N	simple	t	f	visible	\N	
392	b521814b-a4cb-4dc3-bc61-0ac7cc18b268	PINT ALUMINIO INDUSTRIAL GAL SOLINTEX 795	20684	0	36.00	2025-10-24 00:47:07.752791	2025-10-24 00:47:07.752791	\N	\N	\N	simple	t	f	visible	\N	
393	747698f4-9fa5-4243-9093-702295bbf955	PINT TRAFICO AMARILLO SEÑAL GAL SOLINTEX	20685	2	36.00	2025-10-24 00:47:07.769582	2025-10-24 00:47:07.769582	\N	\N	\N	simple	t	f	visible	\N	
394	40eb4c77-7523-4368-83c0-07861283d94f	FONDO CROMATO ZINC GALON SOLINTEX 780	20733	30	30.00	2025-10-24 00:47:07.784988	2025-10-24 00:47:07.784988	\N	\N	\N	simple	t	f	visible	\N	
395	9e9a9bbb-6552-48cb-b073-570792c78927	FONDO CROMATO DE ZINC 1/4 SOLINTEX 780	25685	0	9.00	2025-10-24 00:47:07.80018	2025-10-24 00:47:07.80018	\N	\N	\N	simple	t	f	visible	\N	
396	098a163c-3801-4f27-bc51-05e34c03c53b	PASTA PROF CUÑ 4G SOLINTEX 905	20681	52	73.00	2025-10-24 00:47:07.819072	2025-10-24 00:47:07.819072	\N	\N	\N	simple	t	f	visible	\N	
397	38441f96-5f94-491f-928b-c5f3c8ba7f2f	PASTA PROF 1GAL SOLINTEX 905	20682	4	16.00	2025-10-24 00:47:07.833847	2025-10-24 00:47:07.833847	\N	\N	\N	simple	t	f	visible	\N	
398	52409823-3edc-44ef-b581-c3e0d0464191	PASTA PROF 1/4 GAL SOLINTEX 905	25228	1	4.00	2025-10-24 00:47:07.848911	2025-10-24 00:47:07.848911	\N	\N	\N	simple	t	f	visible	\N	
399	fb87b597-df98-439c-8d94-a2507364046d	FONDO NEGRO 1GAL SOLINTEX 720	20670	28	21.00	2025-10-24 00:47:07.862508	2025-10-24 00:47:07.862508	\N	\N	\N	simple	t	f	visible	\N	
400	8f7e03ef-1d56-4e4c-be31-fc8fc28a863b	FONDO ROJO 1GAL SOLINTEX 710	20671	32	21.00	2025-10-24 00:47:07.876552	2025-10-24 00:47:07.876552	\N	\N	\N	simple	t	f	visible	\N	
401	ba5a408b-9fe8-4c36-add7-1782e9835702	FONDO GRIS 1GAL SOLINTEX 715	20672	92	22.00	2025-10-24 00:47:07.890441	2025-10-24 00:47:07.890441	\N	\N	\N	simple	t	f	visible	\N	
402	5c8b3f6a-32a1-487e-8f9d-6a6bbedee504	FONDO BLANCO 1GAL SOLINTEX 721	20673	36	23.00	2025-10-24 00:47:07.904127	2025-10-24 00:47:07.904127	\N	\N	\N	simple	t	f	visible	\N	
403	add028d0-d81a-4353-a879-4458e8159d09	FONDO NEGRO 1/4G SOLINTEX 720	20676	133	7.00	2025-10-24 00:47:07.917041	2025-10-24 00:47:07.917041	\N	\N	\N	simple	t	f	visible	\N	
404	3c13a97c-41c3-4e03-973a-f47563cd5b0b	FONDO GRIS 1/4G SOLINTEX 715	20674	113	8.00	2025-10-24 00:47:07.929394	2025-10-24 00:47:07.929394	\N	\N	\N	simple	t	f	visible	\N	
405	a57512ac-dc1a-47d9-99e0-3c9b7c82cb77	FONDO ROJO 1/4G SOLINTEX 710	20675	49	6.00	2025-10-24 00:47:07.942192	2025-10-24 00:47:07.942192	\N	\N	\N	simple	t	f	visible	\N	
406	420c60bc-ec9d-4c65-ad9d-888b8270b283	FONDO BLANCO 1/4G SOLINTEX 721	20677	106	6.00	2025-10-24 00:47:07.954963	2025-10-24 00:47:07.954963	\N	\N	\N	simple	t	f	visible	\N	
407	8487c81a-94b3-456b-b20b-fffdd4151b0b	SELLADOR ANTIALCALINO 4GAL SOLINTEX 3053	20725	8	92.00	2025-10-24 00:47:07.9683	2025-10-24 00:47:07.9683	\N	\N	\N	simple	t	f	visible	\N	
408	38b6a84b-9f8e-4323-81b3-4ecbaf8ed92c	SELLADOR ANTIALCALINO 1 GAL SOLINTEX 3053	20686	2	19.00	2025-10-24 00:47:07.981338	2025-10-24 00:47:07.981338	\N	\N	\N	simple	t	f	visible	\N	
409	79a57bae-7f00-428e-9e26-72f87f4e86ba	DISCO DIAMANT 4 1/2 CONC/MAR TURBO OMEGA ABRAC DIAMA-3115	20901	9	7.00	2025-10-24 00:47:07.995528	2025-10-24 00:47:07.995528	\N	\N	\N	simple	t	f	visible	\N	
410	8e7f21c4-55dc-4b0c-890f-e41d64357864	DISCO ESM 7X1/4X7/8 GDESEO DISC-E77	21513	51	3.00	2025-10-24 00:47:08.009397	2025-10-24 00:47:08.009397	\N	\N	\N	simple	t	f	visible	\N	
411	cf8a6bac-3eba-4c95-987c-2eeb4808a08d	DISCO CORT 4 1/2X1/8 METAL PLANO ALADINO DA32-P	22103	0	0.00	2025-10-24 00:47:08.02406	2025-10-24 00:47:08.02406	\N	\N	\N	simple	t	f	visible	\N	
412	e6d81f07-3913-4411-83dc-4f8d87e39e53	DISCO ESM 7X1/4 X7/8 METAL STRUGGER/T27 8004202	22181	31	3.00	2025-10-24 00:47:08.038888	2025-10-24 00:47:08.038888	\N	\N	\N	simple	t	f	visible	\N	
413	c62e7961-eaf2-40c4-a4c2-f68b15abe7c9	DISCO CORT 4 1/2X1/8 METAL CONCAVO ALADINO DA32	22239	0	1.00	2025-10-24 00:47:08.053779	2025-10-24 00:47:08.053779	\N	\N	\N	simple	t	f	visible	\N	
414	d89cb5ff-39d3-4402-9627-71104710d35b	DISCO CORT 7X1/16X7/8 ULTRAFINO TAKIMA 369496	22357	2	1.00	2025-10-24 00:47:08.068516	2025-10-24 00:47:08.068516	\N	\N	\N	simple	t	f	visible	\N	
415	eabe611b-fe8d-47ad-9bfc-3061e77ef214	DISCO CORT 14X1/8X1 METAL TAURO TOOLS DIS1000	22382	36	3.00	2025-10-24 00:47:08.083694	2025-10-24 00:47:08.083694	\N	\N	\N	simple	t	f	visible	\N	
416	dd10f924-6636-487f-a85e-654e8f5a97be	DISCO ESM 4-1/2 MET LIJA GRNO 100 FLAP STRUGGER	22803	54	1.00	2025-10-24 00:47:08.123039	2025-10-24 00:47:08.123039	\N	\N	\N	simple	t	f	visible	\N	
417	0e4f20cf-c752-4f17-bf97-c9d20e87204c	DISCO CORT 7X1/16X7/8 ULTRAFINO GDESEO DISC-F07	23093	320	1.00	2025-10-24 00:47:08.137632	2025-10-24 00:47:08.137632	\N	\N	\N	simple	t	f	visible	\N	
418	834a5170-f6b9-41ab-aa1d-d24d7895537d	DISCO ESM 4 1/2 MET LIJA GRNO 60 FLAP COVO CV-FD115-60 8696	23285	0	2.00	2025-10-24 00:47:08.153247	2025-10-24 00:47:08.153247	\N	\N	\N	simple	t	f	visible	\N	
419	7a45d73b-c971-4e2d-8e87-f386f019f2e1	DISCO CORT 14X3/32X1 METAL DW44640 DEWALT	23461	0	9.00	2025-10-24 00:47:08.168028	2025-10-24 00:47:08.168028	\N	\N	\N	simple	t	f	visible	\N	
420	c0005138-d704-4376-97a3-6db95ccf6bf5	DISCO CORT 14X1/8X1 COVO CV-CW-3532 7953	34263	0	4.00	2025-10-24 00:47:08.174159	2025-10-24 00:47:08.174159	\N	\N	\N	simple	t	f	visible	\N	
421	a4b4182a-344e-49d2-9608-fb6d22d8c076	DISCO ESM 7X1/4X7/8 COVO CV-GW2-1806B 9114	24699	117	2.00	2025-10-24 00:47:08.179861	2025-10-24 00:47:08.179861	\N	\N	\N	simple	t	f	visible	\N	
422	1dd9ae2b-f2fd-49c2-8241-56e8cdb8923c	DISCO CORT 4 1/2X3/64x7/8 FINO NEO 12CS12115RD	24937	18	0.00	2025-10-24 00:47:08.192797	2025-10-24 00:47:08.192797	\N	\N	\N	simple	t	f	visible	\N	
423	bcba7c38-a031-4ab0-8197-1acdd6112f73	DISCO ESM 4 1/2 MET LIJA 80 FLAP POWER/DIGIDISK	25012	0	1.00	2025-10-24 00:47:08.205483	2025-10-24 00:47:08.205483	\N	\N	\N	simple	t	f	visible	\N	
424	1e1774d8-8b31-4419-9e67-fc627f5fcf16	DISCO DIAMANT 7" SEGMENT COVO DS180G-CV 8128	25152	51	7.00	2025-10-24 00:47:08.21889	2025-10-24 00:47:08.21889	\N	\N	\N	simple	t	f	visible	\N	
425	989f521a-98fa-4a46-88b5-c72dc2266f88	DISCO CORT 14X1/8X1" A/C STRUGGER	25440	5	5.00	2025-10-24 00:47:08.232263	2025-10-24 00:47:08.232263	\N	\N	\N	simple	t	f	visible	\N	
426	1c558143-13a8-49d4-a1a9-2f75ba57f83e	DISCO ESM 7X1/4X7/8 WINONE/TAURO TOOLS DIS1006	25735	48	3.00	2025-10-24 00:47:08.245572	2025-10-24 00:47:08.245572	\N	\N	\N	simple	t	f	visible	\N	
427	2edcb2e2-9f85-45d4-bd91-9187a6cd5188	DISCO ESM 7X1/4X7/8 H/A DA35 ALADINO	26667	1	2.00	2025-10-24 00:47:08.260887	2025-10-24 00:47:08.260887	\N	\N	\N	simple	t	f	visible	\N	
428	0915d6ec-2654-4675-b82c-e381f7b3ad84	DISCO ESM 7X1/4X7/8 DIGIDISK	26676	1	2.00	2025-10-24 00:47:08.274148	2025-10-24 00:47:08.274148	\N	\N	\N	simple	t	f	visible	\N	
429	6dda3221-9f0f-4111-b174-251fe7769266	DISCO ESM 4 1/2X1/4X7/8 DW44540 DEWALT DIS-706	28319	188	2.00	2025-10-24 00:47:08.289021	2025-10-24 00:47:08.289021	\N	\N	\N	simple	t	f	visible	\N	
430	68174867-7175-4a40-aa27-73aed37b0f40	DISCO ESM 7X1/4X7/8 DW44580 DEWALT DIS-709	28333	78	4.00	2025-10-24 00:47:08.302305	2025-10-24 00:47:08.302305	\N	\N	\N	simple	t	f	visible	\N	
431	c51991dd-c1e1-4aac-9058-8b0a4b4ae528	DISCO DIAMANT 7" TURBO COVO DS180WAD-CV 8127	28503	5	7.00	2025-10-24 00:47:08.314637	2025-10-24 00:47:08.314637	\N	\N	\N	simple	t	f	visible	\N	
432	213c6f48-5df8-4513-b46d-0322aba15a2d	DISCO DIAMANT 7 SEGM PRO-DIAM037000 PROMAKER	26236	1	17.00	2025-10-24 00:47:08.328802	2025-10-24 00:47:08.328802	\N	\N	\N	simple	t	f	visible	\N	
433	20a3cf58-b36c-4530-b0cf-33d23a9c6f15	DISCO CORT 4 1/2X1/8 METAL CARBORUNDUM/PREMIER	28623	108	1.00	2025-10-24 00:47:08.342046	2025-10-24 00:47:08.342046	\N	\N	\N	simple	t	f	visible	\N	
434	58405b56-8d62-4d06-8261-c161d8e83828	DISCO CORT 14X1/8X1 P/METAL DIS-09/DTP/DIGIDISK	26380	1	3.00	2025-10-24 00:47:08.355907	2025-10-24 00:47:08.355907	\N	\N	\N	simple	t	f	visible	\N	
435	53ec3a75-6a66-41d0-aee7-068c129ae70a	DISCO DIAMANT 4 1/2 TURBO CARBO FORCE CARBORUNDUM DIS101	28757	1	0.00	2025-10-24 00:47:08.369433	2025-10-24 00:47:08.369433	\N	\N	\N	simple	t	f	visible	\N	
436	3daee245-6ddf-40ac-a15c-abcf9ea393ce	DISCO DIAMANT 4 1/2 TURBO GDESEO DISC-CR41	26504	7	4.00	2025-10-24 00:47:08.382872	2025-10-24 00:47:08.382872	\N	\N	\N	simple	t	f	visible	\N	
437	9a81a2f5-b56b-464c-b886-a2d44845d767	DISCO CORT 4 1/2X1/16X7/8 FINO DEWALT DW44601 DIS-705	29017	41	2.00	2025-10-24 00:47:08.396391	2025-10-24 00:47:08.396391	\N	\N	\N	simple	t	f	visible	\N	
438	19e7b988-52a7-4314-a3a1-b90b71453950	DISCO CORT 7X1/8X7/8 DIS1005 TAURO TOOLS DIS1005	26561	28	2.00	2025-10-24 00:47:08.41061	2025-10-24 00:47:08.41061	\N	\N	\N	simple	t	f	visible	\N	
439	73d27e75-d566-4d80-a681-cddef6440456	DISCO CORT 14X1/8 METAL BOSCH 875835	29173	18	4.00	2025-10-24 00:47:08.425434	2025-10-24 00:47:08.425434	\N	\N	\N	simple	t	f	visible	\N	
440	4dc049e5-9e74-4f40-ba3b-1c1d76ee8810	DISCO DIAMANT 4 1/2 TURBO COVO 7A136-B115-CV 4423	29374	47	3.00	2025-10-24 00:47:08.439193	2025-10-24 00:47:08.439193	\N	\N	\N	simple	t	f	visible	\N	
441	9057ee0a-2d73-4b58-a996-f2d7c43cc861	DISCO DIAMANT 7 TURBO NORTON	29381	4	15.00	2025-10-24 00:47:08.452699	2025-10-24 00:47:08.452699	\N	\N	\N	simple	t	f	visible	\N	
442	3d5a51da-8206-4680-adbb-bf3790235a2f	DISCO CORT 7X1/8X7/8 METAL PLANO ALADINO DA33-P	29665	1	1.00	2025-10-24 00:47:08.466797	2025-10-24 00:47:08.466797	\N	\N	\N	simple	t	f	visible	\N	
443	b87b5e31-980f-437b-a9c5-8b8728df3c90	DISCO CORT 7X1/8X7/8  METAL STRUGGER/T42 8004002	30131	50	1.00	2025-10-24 00:47:08.480517	2025-10-24 00:47:08.480517	\N	\N	\N	simple	t	f	visible	\N	
444	6aa15b25-6e64-4c6b-84fb-ec2cabfa4b38	DISCO DIAMANT 14" SEG COVO CV-DCW-350G 8349	30265	17	35.00	2025-10-24 00:47:08.497478	2025-10-24 00:47:08.497478	\N	\N	\N	simple	t	f	visible	\N	
445	c2c8fa84-d4fe-45d8-aece-075647fced38	DISCO DIAMANT 7 CONTINUO GDESEO DISC-CR72	30295	5	9.00	2025-10-24 00:47:08.523979	2025-10-24 00:47:08.523979	\N	\N	\N	simple	t	f	visible	\N	
446	49d5ba59-ad51-4391-9958-71862e9af355	DISCO ESM 4 1/X1/4X7/8 GDESEO DISC-E47	31510	58	1.00	2025-10-24 00:47:08.539082	2025-10-24 00:47:08.539082	\N	\N	\N	simple	t	f	visible	\N	
447	1c390a21-c111-447e-862a-df79e34e8e48	DISCO ESM 4 1/2 MET LIJA 80 FLAP SKILFUL DA52	31770	0	1.00	2025-10-24 00:47:08.55288	2025-10-24 00:47:08.55288	\N	\N	\N	simple	t	f	visible	\N	
448	e7f84137-2087-42c1-b3c4-e18821d88f7c	DISCO CORT 4 1/2X3/64 ULTRAFINO CONCAVO GDESEO DISC-F02	31932	21	0.00	2025-10-24 00:47:08.571488	2025-10-24 00:47:08.571488	\N	\N	\N	simple	t	f	visible	\N	
449	c2a7f103-e707-4ea7-959d-0a14bd8da8cd	DISCO DIAMANT 7 TURBO GDESEO DISC-CR71	32635	7	10.00	2025-10-24 00:47:08.586243	2025-10-24 00:47:08.586243	\N	\N	\N	simple	t	f	visible	\N	
450	a3a82cb6-d690-40d0-aba5-ee6cd77cc5ce	DISCO CORT 7X1/8X7/8 A/INOX PREMIER CARBORUNDUM 66252842522	32668	17	2.00	2025-10-24 00:47:08.603584	2025-10-24 00:47:08.603584	\N	\N	\N	simple	t	f	visible	\N	
451	a6e71f5a-0d19-4f62-a0a8-101b254c0b2c	DISCO CORT 14X3/32X1 METAL CARBORUNDUM	32780	1	5.00	2025-10-24 00:47:08.618309	2025-10-24 00:47:08.618309	\N	\N	\N	simple	t	f	visible	\N	
452	2ee56934-d67a-484b-900e-15b489dd9565	DISCO ESM 4 1/2 MET LIJA GRNO 100 COVO CV-FD115-100 8828	32892	12	1.00	2025-10-24 00:47:08.632331	2025-10-24 00:47:08.632331	\N	\N	\N	simple	t	f	visible	\N	
453	cf785580-9b32-4029-a8c9-c31c9b716a25	DISCO DIAMANT 4 1/2 CONTI GDESEO DISC-CR42	32904	28	3.00	2025-10-24 00:47:08.646104	2025-10-24 00:47:08.646104	\N	\N	\N	simple	t	f	visible	\N	
454	9c9d2e86-7e08-4dc8-94d3-df02661a485a	DISCO CORT 4 1/2X3/64 FINO CARBO SILVER CARBORUNDUM 6813	32908	164	0.00	2025-10-24 00:47:08.662216	2025-10-24 00:47:08.662216	\N	\N	\N	simple	t	f	visible	\N	
455	37cb87ad-5973-4ce5-a984-3326a52ffe17	DISCO CORT 14X1/8 METAL GDESEO DISC-T55	32921	28	3.00	2025-10-24 00:47:08.678422	2025-10-24 00:47:08.678422	\N	\N	\N	simple	t	f	visible	\N	
456	9873db99-506d-499a-a850-969e9a77a4c9	DISCO DIAMANT 4 1/2 TURBO 32-056 EXXEL/PITBULL DIS-045	32978	7	5.00	2025-10-24 00:47:08.693378	2025-10-24 00:47:08.693378	\N	\N	\N	simple	t	f	visible	\N	
457	3743a136-6062-4234-bfbe-53a4cfcdcf35	DISCO DIAMANT 4 1/2 CONT CLASSIC 7066	26715	0	2.00	2025-10-24 00:47:08.709992	2025-10-24 00:47:08.709992	\N	\N	\N	simple	t	f	visible	\N	
458	b54ee80c-f12e-4dc1-a194-9f410d6ae225	DISCO CORT 14X7/64X1 METAL DW44640 DEWALT DIS-702	26726	100	9.00	2025-10-24 00:47:08.735379	2025-10-24 00:47:08.735379	\N	\N	\N	simple	t	f	visible	\N	
459	05894339-0cd2-41ee-b441-d6e6853e3fa7	DISCO CORT 4 1/2X5/64 FINO CARBORUNDUM 832819	26822	39	1.00	2025-10-24 00:47:08.748889	2025-10-24 00:47:08.748889	\N	\N	\N	simple	t	f	visible	\N	
460	75b0cc4e-c2b8-470e-ac6f-cdfa48e63f7c	DISCO ESM  4-1/2X1/4  A/INOX PREMIER CARBORUNDUM	26910	40	2.00	2025-10-24 00:47:08.762649	2025-10-24 00:47:08.762649	\N	\N	\N	simple	t	f	visible	\N	
461	f631de0c-d926-455a-9b43-ebd7e1a908c7	DISCO CORT 7X1/8X7/8 DW44605/DW44601 DEWALT DIS-061	27761	71	4.00	2025-10-24 00:47:08.777207	2025-10-24 00:47:08.777207	\N	\N	\N	simple	t	f	visible	\N	
462	9a3d9ad6-b160-4558-809c-cbaa1253c4b4	DISCO CORT 7X1/16X7/8 ULTRA FINO CARBORUNDUM 5859	28161	1	1.00	2025-10-24 00:47:08.791197	2025-10-24 00:47:08.791197	\N	\N	\N	simple	t	f	visible	\N	
463	72f060a6-3cfe-43c9-bbd2-1e734541fe1c	DISCO DIAMANT 7 SEGM BOSCH DIS-030	28282	14	39.00	2025-10-24 00:47:08.804621	2025-10-24 00:47:08.804621	\N	\N	\N	simple	t	f	visible	\N	
464	72bf72ee-e4c9-48e7-ae44-3c87adcd3bab	DISCO CORT 4 1/2X 1mm METAL BOSCH 545301	28303	24	1.00	2025-10-24 00:47:08.818454	2025-10-24 00:47:08.818454	\N	\N	\N	simple	t	f	visible	\N	
465	b264bdcc-175e-4a51-a81e-95d82c160276	DISCO DIAMANT 7" TURBO BOSCH DIS-032	33020	9	13.00	2025-10-24 00:47:08.832246	2025-10-24 00:47:08.832246	\N	\N	\N	simple	t	f	visible	\N	
466	b79c435e-f30d-4c97-8930-a7e270c5d8d5	DISCO CORT 7X1/16X78 ULTRAFINO CONCAVO GDESEO DISC-F08	33273	18	1.00	2025-10-24 00:47:08.845482	2025-10-24 00:47:08.845482	\N	\N	\N	simple	t	f	visible	\N	
467	031f865d-c85a-4f01-88e6-07c2aaaec30c	DISCO CORT 4 1/2X3/64 ULTRAFINO GDESEO DISC-F01	33339	271	0.00	2025-10-24 00:47:08.859293	2025-10-24 00:47:08.859293	\N	\N	\N	simple	t	f	visible	\N	
468	cde83f21-54a3-49d7-8d77-7699a19e5a3c	DISCO CORT 7X1/16X7/8  ULTRA FINO COVO CV-CW-1816 7921	33352	394	1.00	2025-10-24 00:47:08.874438	2025-10-24 00:47:08.874438	\N	\N	\N	simple	t	f	visible	\N	
469	4b2f0b37-509f-49c7-8fa1-46f0979a6773	DISCO CORT 14X7/64X1 METAL TAKIMA 369447	33414	21	4.00	2025-10-24 00:47:08.88984	2025-10-24 00:47:08.88984	\N	\N	\N	simple	t	f	visible	\N	
470	2c71b2a9-890d-4625-88b0-9fd32f5dce2d	DISCO CORT 7X1/16X7/8 PROMAKER PRO-ABRA067116	33458	79	2.00	2025-10-24 00:47:08.903638	2025-10-24 00:47:08.903638	\N	\N	\N	simple	t	f	visible	\N	
471	6c69f6b9-1b38-4352-bfab-5990fa452ea1	DISCO CORT 4 1/2 X 1/16 X 7/8 METAL STRUGGER/T41	34443	15	0.00	2025-10-24 00:47:08.917422	2025-10-24 00:47:08.917422	\N	\N	\N	simple	t	f	visible	\N	
472	101dc7e6-1ac7-4e4f-8b64-f787f5bbc9a4	DISCO DIAMANT 4 1/2 SEG GDESEO DISC-CR43	26327	76	4.00	2025-10-24 00:47:08.932547	2025-10-24 00:47:08.932547	\N	\N	\N	simple	t	f	visible	\N	
473	a8988a58-4cc0-44a1-accd-4eb81628e7de	DISCO CORT 4 1/2X1/16X7/8 FINO CARBORUNDUM	28608	36	0.00	2025-10-24 00:47:08.948366	2025-10-24 00:47:08.948366	\N	\N	\N	simple	t	f	visible	\N	
474	9436fc2a-2c41-478b-ad88-43cf7b9c9309	DISCO DIAMANT 7" CONT COVO CV-DCW-180W 8057	29623	6	7.00	2025-10-24 00:47:08.963479	2025-10-24 00:47:08.963479	\N	\N	\N	simple	t	f	visible	\N	
475	598fc6d0-97e0-4ce2-8c89-9cdfa094e726	DISCO ESM 4-1/2X1/4X7/8 PT-1064 HUNTER	33282	1	0.00	2025-10-24 00:47:08.978246	2025-10-24 00:47:08.978246	\N	\N	\N	simple	t	f	visible	\N	
476	e233f9b3-b014-43aa-b77b-6382b0291a94	DISCO CORT 7X1/8X7/8 CARBORUDRUM 2534	33354	18	1.00	2025-10-24 00:47:08.992918	2025-10-24 00:47:08.992918	\N	\N	\N	simple	t	f	visible	\N	
477	263635a5-24a5-46bd-9f1a-e6ef55f69778	YEE UNIT AN 04X04 (110MM)  C/C UNITECA	20119	251	6.00	2025-10-24 00:47:09.007791	2025-10-24 00:47:09.007791	\N	\N	\N	simple	t	f	visible	\N	
478	399a9889-4cb1-4e17-9549-d3123abd8ac7	GANCHO P/CANAL PVC BLANCO	20172	94	3.00	2025-10-24 00:47:09.022104	2025-10-24 00:47:09.022104	\N	\N	\N	simple	t	f	visible	\N	
479	3ec15311-f867-4feb-970c-3c00070ffc43	DISPONIBLE	20387	0	1.00	2025-10-24 00:47:09.036406	2025-10-24 00:47:09.036406	\N	\N	\N	simple	t	f	visible	\N	
480	18048312-21cb-4d3c-a0a9-4e493d13f221	UNION UNIV PVC 3/4 A/B ROSC CPP-AB20 SEMILIC	20440	215	1.00	2025-10-24 00:47:09.051765	2025-10-24 00:47:09.051765	\N	\N	\N	simple	t	f	visible	\N	
481	19f0d0d2-cfbb-4744-8551-6322765cc0cb	NIPLE HG  3/4 CORRIDO	20456	9	0.00	2025-10-24 00:47:09.084239	2025-10-24 00:47:09.084239	\N	\N	\N	simple	t	f	visible	\N	
482	96c6f01b-0b77-42a3-975d-451dac51e4a5	CURVA PCO ELECT 1/2X090 CE	21150	1213	0.00	2025-10-24 00:47:09.099358	2025-10-24 00:47:09.099358	\N	\N	\N	simple	t	f	visible	\N	
483	8c3290a0-c8c9-48ce-a888-d885e61ca5e2	CURVA PCO ELECT 3/4X090 CE	21151	1319	0.00	2025-10-24 00:47:09.114602	2025-10-24 00:47:09.114602	\N	\N	\N	simple	t	f	visible	\N	
484	0ca64240-2c4d-4248-b4a1-50dda58a0c6e	CURVA PCO ELECT 01X090 CE	21152	588	1.00	2025-10-24 00:47:09.130225	2025-10-24 00:47:09.130225	\N	\N	\N	simple	t	f	visible	\N	
485	58884d7d-2f48-46fc-9b50-05d88475b872	CURVA PCO ELECT 1-1/2X090 CE	21153	65	2.00	2025-10-24 00:47:09.145174	2025-10-24 00:47:09.145174	\N	\N	\N	simple	t	f	visible	\N	
486	4fa2f1d4-bb73-40b0-a8cb-12666bf09729	CODO PCO A/N 050MMX045 C/E	21161	773	1.00	2025-10-24 00:47:09.160645	2025-10-24 00:47:09.160645	\N	\N	\N	simple	t	f	visible	\N	
487	43f55b8f-faa6-4e79-b22d-630cb4eeca76	CODO PCO A/N 075MMX045 C/E 928136	21162	146	2.00	2025-10-24 00:47:09.174893	2025-10-24 00:47:09.174893	\N	\N	\N	simple	t	f	visible	\N	
488	d73dec3d-ab40-40e3-b582-6d28aa60d36e	CODO PCO A/N 110MMX045 C/E	21163	495	3.00	2025-10-24 00:47:09.188697	2025-10-24 00:47:09.188697	\N	\N	\N	simple	t	f	visible	\N	
489	5724fcd0-5ede-4c63-b32e-b6f788842e00	CODO PCO A/N 050MMX090 C/E 928140	21164	968	1.00	2025-10-24 00:47:09.202201	2025-10-24 00:47:09.202201	\N	\N	\N	simple	t	f	visible	\N	
490	bc0e5696-fbf7-4d0f-ac15-a7d3ca3c49e2	CODO PCO A/N 075MMX090 C/E	21165	203	2.00	2025-10-24 00:47:09.217798	2025-10-24 00:47:09.217798	\N	\N	\N	simple	t	f	visible	\N	
491	a08ffbf7-62f9-4cdf-92e9-bb28fe00e0ab	TEE PCO A/N 050MM ECC	21167	186	1.00	2025-10-24 00:47:09.231442	2025-10-24 00:47:09.231442	\N	\N	\N	simple	t	f	visible	\N	
492	390a22c2-3f5c-4397-bd7b-b004144c55c7	TEE PCO A/N RED 110MMX050MM E	21170	48	6.00	2025-10-24 00:47:09.245968	2025-10-24 00:47:09.245968	\N	\N	\N	simple	t	f	visible	\N	
493	a8a7ed50-257c-42a5-9946-3d9b6a8fe8ed	TEE PCO A/N RED 110MMX075MM E	21171	74	8.00	2025-10-24 00:47:09.260681	2025-10-24 00:47:09.260681	\N	\N	\N	simple	t	f	visible	\N	
494	5dabfa73-e828-483e-95b5-5493ebc0cf5b	TEE PCO A/N 110MM ECC	21172	80	9.00	2025-10-24 00:47:09.276084	2025-10-24 00:47:09.276084	\N	\N	\N	simple	t	f	visible	\N	
495	a7cc0e77-ca05-4b37-85c9-de7d64c8c0f0	YEE PCO A/N 050MM ECC 928874	21173	203	2.00	2025-10-24 00:47:09.291867	2025-10-24 00:47:09.291867	\N	\N	\N	simple	t	f	visible	\N	
496	7634bd79-c134-43a3-b57c-031d63d009c2	YEE PCO A/N RED 075MMX050MM E 928875	21174	119	4.00	2025-10-24 00:47:09.306567	2025-10-24 00:47:09.306567	\N	\N	\N	simple	t	f	visible	\N	
497	e34f4438-1747-40a4-9715-d4a35e2cfe70	YEE PCO A/N 075MM ECC	21175	21	5.00	2025-10-24 00:47:09.32234	2025-10-24 00:47:09.32234	\N	\N	\N	simple	t	f	visible	\N	
498	1481f523-67ba-4c4b-ad4d-bd43a31c7263	YEE PCO A/N RED 110MMX050MM E	21176	14	7.00	2025-10-24 00:47:09.335982	2025-10-24 00:47:09.335982	\N	\N	\N	simple	t	f	visible	\N	
499	df3e4787-edc7-42b1-9673-c6c586dece9a	YEE PCO A/N RED 110MMX075MM E	21177	217	10.00	2025-10-24 00:47:09.348676	2025-10-24 00:47:09.348676	\N	\N	\N	simple	t	f	visible	\N	
500	d14ed5c0-3959-473f-9ee2-b2065fae6e44	YEE PCO A/N 110MM ECC	21178	97	9.00	2025-10-24 00:47:09.354073	2025-10-24 00:47:09.354073	\N	\N	\N	simple	t	f	visible	\N	
501	ee180373-d5e9-4768-9b36-ab73cd3e0237	REDUC PCO A/N 075MMX050MM CE	21179	1	1.00	2025-10-24 00:47:09.369146	2025-10-24 00:47:09.369146	\N	\N	\N	simple	t	f	visible	\N	
502	e00136e2-a9b9-47b2-ae5f-bcfa6b1852b8	REDUC PCO A/N 110MMX050MM CE	21180	109	3.00	2025-10-24 00:47:09.383385	2025-10-24 00:47:09.383385	\N	\N	\N	simple	t	f	visible	\N	
503	0714f7e6-8f89-43fe-901f-9434dcf08980	REDUC PCO A/N 110MMX075MM CE	21181	70	3.00	2025-10-24 00:47:09.396222	2025-10-24 00:47:09.396222	\N	\N	\N	simple	t	f	visible	\N	
504	2dc2dc8e-4427-4423-bc79-b6642ec3ff93	TAPON PCO A/N 050mm E SIMPLE	21182	399	0.00	2025-10-24 00:47:09.40869	2025-10-24 00:47:09.40869	\N	\N	\N	simple	t	f	visible	\N	
505	0a2a5300-e222-4c8a-a528-ffd892e253ce	TAPON PCO A/N 075mm E SIMPLE	21183	66	0.00	2025-10-24 00:47:09.421584	2025-10-24 00:47:09.421584	\N	\N	\N	simple	t	f	visible	\N	
506	b7a9f734-061d-4dee-b56c-49da0f33081b	TAPON PCO A/N 110mm E SIMPLE	21184	160	2.00	2025-10-24 00:47:09.434384	2025-10-24 00:47:09.434384	\N	\N	\N	simple	t	f	visible	\N	
507	97b84060-0907-4b24-b7e0-8abaf0a08e6c	CAMPANA PCO A/N 050MM 928106	21185	102	0.00	2025-10-24 00:47:09.447334	2025-10-24 00:47:09.447334	\N	\N	\N	simple	t	f	visible	\N	
508	4d745224-ac4e-4084-9e1b-5f1e7a8242fe	CAMPANA PCO A/N 075MM	21186	277	1.00	2025-10-24 00:47:09.459582	2025-10-24 00:47:09.459582	\N	\N	\N	simple	t	f	visible	\N	
509	8e358c7f-5364-4c7b-b240-d10a493fe12c	CAMPANA PCO A/N 110MM	21187	71	3.00	2025-10-24 00:47:09.471715	2025-10-24 00:47:09.471715	\N	\N	\N	simple	t	f	visible	\N	
510	f7dccdec-d0f1-42ef-adc0-a9924a0b9f90	TEE PCO A/N DOB 050MM ECC	21188	274	3.00	2025-10-24 00:47:09.484097	2025-10-24 00:47:09.484097	\N	\N	\N	simple	t	f	visible	\N	
511	cebae05a-f7a3-4781-9dc6-8f8f02e99d41	SIFON PCO A/N 050MM PLACA C/E	21190	182	4.00	2025-10-24 00:47:09.496449	2025-10-24 00:47:09.496449	\N	\N	\N	simple	t	f	visible	\N	
512	4590acef-b135-4ad2-bd3f-1d75c713e41c	YEE PCO A/N DOBLE 110MM ECC	21191	317	13.00	2025-10-24 00:47:09.508689	2025-10-24 00:47:09.508689	\N	\N	\N	simple	t	f	visible	\N	
513	e1f3f09c-475c-4a03-a1a5-8fb99c3ddcd6	TAPON PCO A/N 050mm REGISTRO	21192	237	0.00	2025-10-24 00:47:09.520768	2025-10-24 00:47:09.520768	\N	\N	\N	simple	t	f	visible	\N	
514	b9342cc4-d1cd-47d4-8d58-ef3aede26d5f	TAPON PCO A/N 075mm REGISTRO	21193	123	1.00	2025-10-24 00:47:09.552594	2025-10-24 00:47:09.552594	\N	\N	\N	simple	t	f	visible	\N	
515	79e5c4b9-e8a4-493b-90ea-70e976a0be9d	TAPON PCO A/N 110MM REGISTRO	21194	0	2.00	2025-10-24 00:47:09.56946	2025-10-24 00:47:09.56946	\N	\N	\N	simple	t	f	visible	\N	
516	0f2ca4b4-ac88-4c7d-9f94-d867de4c29a1	VALVULA BOLA PCO HEMB R 1" 928904	21201	31	8.00	2025-10-24 00:47:09.583612	2025-10-24 00:47:09.583612	\N	\N	\N	simple	t	f	visible	\N	
517	22642d46-993e-43da-b068-18f0b3b96c1c	TEE PCO C-A/B 1	21206	1276	1.00	2025-10-24 00:47:09.598241	2025-10-24 00:47:09.598241	\N	\N	\N	simple	t	f	visible	\N	
518	1a6d5594-07b1-4968-953d-23060e8e3181	CODO PCO C-A/B S 01X90	21207	36	1.00	2025-10-24 00:47:09.611659	2025-10-24 00:47:09.611659	\N	\N	\N	simple	t	f	visible	\N	
519	9e654f88-cae7-4976-b801-342a93f831c4	UNION PCO C-A/B 1	21208	5	0.00	2025-10-24 00:47:09.626117	2025-10-24 00:47:09.626117	\N	\N	\N	simple	t	f	visible	\N	
520	e9ebfde7-fdd6-4b92-baf2-76b149760075	ADAPT PCO C-A/B MACH R 01	21209	308	0.00	2025-10-24 00:47:09.643499	2025-10-24 00:47:09.643499	\N	\N	\N	simple	t	f	visible	\N	
521	bcd8f7f0-f55b-4206-8428-9454fb475294	REDUC PCO C-A/B S 1X3/4	21210	378	0.00	2025-10-24 00:47:09.659027	2025-10-24 00:47:09.659027	\N	\N	\N	simple	t	f	visible	\N	
522	c52263f0-48f3-439e-835b-2b09e2105320	TEE PCO A/N RED 03X02	21217	115	2.00	2025-10-24 00:47:09.673211	2025-10-24 00:47:09.673211	\N	\N	\N	simple	t	f	visible	\N	
523	db5eba74-0ded-4214-9e06-3299066380c7	YEE PCO A/N 3	21261	3	4.00	2025-10-24 00:47:09.687969	2025-10-24 00:47:09.687969	\N	\N	\N	simple	t	f	visible	\N	
524	5c19660a-92dd-42d7-8b96-f43f4c0c51d2	SIFON PCO A/N 2 C/C 180 (SIN CODO)	21273	34	1.00	2025-10-24 00:47:09.701678	2025-10-24 00:47:09.701678	\N	\N	\N	simple	t	f	visible	\N	
525	0ccca1a2-9169-4677-82e2-0cdaff844f7f	TEE PCO A/B S 1/2	21295	766	0.00	2025-10-24 00:47:09.715116	2025-10-24 00:47:09.715116	\N	\N	\N	simple	t	f	visible	\N	
526	ed6f1c58-c7a1-4723-8e48-4dffbce178a7	TEE PCO A/B S 3/4	21296	470	0.00	2025-10-24 00:47:09.729103	2025-10-24 00:47:09.729103	\N	\N	\N	simple	t	f	visible	\N	
527	6c3e6116-44f7-47b5-aac1-6a2f3574524d	TEE PCO A/B RED S 3/4X1/2	21297	10	1.00	2025-10-24 00:47:09.743336	2025-10-24 00:47:09.743336	\N	\N	\N	simple	t	f	visible	\N	
528	39244790-a660-4d5a-a44d-0860dc0f2e44	TEE PCO A/B S 1	21298	156	1.00	2025-10-24 00:47:09.749309	2025-10-24 00:47:09.749309	\N	\N	\N	simple	t	f	visible	\N	
529	37b8d1bb-dd67-47a6-a7ec-39bedc737c21	TEE PCO A/B RED S 01X1/2	21299	79	1.00	2025-10-24 00:47:09.762843	2025-10-24 00:47:09.762843	\N	\N	\N	simple	t	f	visible	\N	
530	d5fb327e-0000-435c-804b-32bb2392ee4e	TEE PCO A/B RED S 01X3/4	21300	119	1.00	2025-10-24 00:47:09.781232	2025-10-24 00:47:09.781232	\N	\N	\N	simple	t	f	visible	\N	
531	3dfb8aa0-c762-4326-a175-b5a15162a14b	TEE PCO A/B S 1-1/2	21302	2	1.00	2025-10-24 00:47:09.795521	2025-10-24 00:47:09.795521	\N	\N	\N	simple	t	f	visible	\N	
532	ce309bc4-0d3d-40d3-b23c-b9b97e3b86a8	TEE PCO A/B S 02	21303	65	5.00	2025-10-24 00:47:09.811076	2025-10-24 00:47:09.811076	\N	\N	\N	simple	t	f	visible	\N	
533	f33cb972-a2b4-4447-bcbb-02d8ce569d7d	TEE PCO A/B S 02-1/2	21304	47	12.00	2025-10-24 00:47:09.825265	2025-10-24 00:47:09.825265	\N	\N	\N	simple	t	f	visible	\N	
534	f020228d-26c3-464e-a80f-bd5d9b976e9d	TEE PCO A/B S 03	21305	19	16.00	2025-10-24 00:47:09.839598	2025-10-24 00:47:09.839598	\N	\N	\N	simple	t	f	visible	\N	
535	500f130e-1136-42b7-a5d7-0a6e5a46fae1	TEE PCO A/B S 04	21306	6	24.00	2025-10-24 00:47:09.854515	2025-10-24 00:47:09.854515	\N	\N	\N	simple	t	f	visible	\N	
536	cc953eba-6f44-4a5a-ac7b-12c8bbd1012a	CODO PCO A/B S 1/2X090	21307	5768	0.00	2025-10-24 00:47:09.868315	2025-10-24 00:47:09.868315	\N	\N	\N	simple	t	f	visible	\N	
537	eed5ef11-ac85-4364-af09-80163e3e0ca2	CODO PCO A/B S 1X090	21309	231	1.00	2025-10-24 00:47:09.883557	2025-10-24 00:47:09.883557	\N	\N	\N	simple	t	f	visible	\N	
538	3712eab6-43f2-4139-8ff6-9bd53e5abf4f	CODO PCO A/B S 1-1/2X090	21311	114	2.00	2025-10-24 00:47:09.89998	2025-10-24 00:47:09.89998	\N	\N	\N	simple	t	f	visible	\N	
539	e8921ccd-67bb-4105-9e3d-ed74d9b0f5b7	CODO PCO A/B S 4X090	21315	16	18.00	2025-10-24 00:47:09.915163	2025-10-24 00:47:09.915163	\N	\N	\N	simple	t	f	visible	\N	
540	7e359d72-c3b4-493d-9eb3-dd488a4e4a8f	CODO PCO A/B S 1/2X045	21316	212	0.00	2025-10-24 00:47:09.929679	2025-10-24 00:47:09.929679	\N	\N	\N	simple	t	f	visible	\N	
541	f9d27db3-5d25-4b39-8fec-c95a0f1c83ee	CODO PCO A/B S 3/4X45	21317	1178	0.00	2025-10-24 00:47:09.944004	2025-10-24 00:47:09.944004	\N	\N	\N	simple	t	f	visible	\N	
542	a3868e66-888b-45e4-a61c-06076737b0eb	CODO PCO A/B S 1X045	21318	2030	0.00	2025-10-24 00:47:09.957846	2025-10-24 00:47:09.957846	\N	\N	\N	simple	t	f	visible	\N	
543	8e6c5df6-0987-40ed-a123-c75aa38a2c1a	UNION PCO A/B S 1/2	21325	1218	0.00	2025-10-24 00:47:09.971574	2025-10-24 00:47:09.971574	\N	\N	\N	simple	t	f	visible	\N	
544	d8bb520e-b70b-4d93-bb58-36a4d9348795	UNION PCO A/B S 3/4	21326	1088	0.00	2025-10-24 00:47:09.985011	2025-10-24 00:47:09.985011	\N	\N	\N	simple	t	f	visible	\N	
545	98fd10a8-9c63-4f15-a39b-3de038f15953	UNION PCO A/B S 1	21327	165	0.00	2025-10-24 00:47:09.997884	2025-10-24 00:47:09.997884	\N	\N	\N	simple	t	f	visible	\N	
546	c533ef68-aeeb-4758-9a54-7554f6de61e7	UNION PCO A/B S 1-1/2	21329	28	0.00	2025-10-24 00:47:10.028422	2025-10-24 00:47:10.028422	\N	\N	\N	simple	t	f	visible	\N	
547	ef192348-ac60-4d59-b879-d5ea60f4b2b0	UNION PCO A/B S 2	21330	62	2.00	2025-10-24 00:47:10.042567	2025-10-24 00:47:10.042567	\N	\N	\N	simple	t	f	visible	\N	
548	8a2c5bf6-b495-437c-be5c-8ce7754ca93f	UNION PCO A/B S 2-1/2	21331	1	3.00	2025-10-24 00:47:10.057973	2025-10-24 00:47:10.057973	\N	\N	\N	simple	t	f	visible	\N	
549	230a8bfa-5759-46b2-b28a-e917f94584b8	UNION PCO A/B S 3	21332	25	4.00	2025-10-24 00:47:10.071472	2025-10-24 00:47:10.071472	\N	\N	\N	simple	t	f	visible	\N	
550	9256ba60-f197-4153-9c11-54a5a7de98de	UNION PCO A/B S 4	21333	9	7.00	2025-10-24 00:47:10.085609	2025-10-24 00:47:10.085609	\N	\N	\N	simple	t	f	visible	\N	
551	a63b936e-4b07-41fc-884d-778ae294d22b	ADAPT PCO A/B HEMB S/R 1/2	21334	1113	0.00	2025-10-24 00:47:10.099173	2025-10-24 00:47:10.099173	\N	\N	\N	simple	t	f	visible	\N	
552	bdd91bd5-b222-4248-b3a8-c8248442e984	ADAPT PCO A/B HEMB S/R 3/4	21336	276	0.00	2025-10-24 00:47:10.112528	2025-10-24 00:47:10.112528	\N	\N	\N	simple	t	f	visible	\N	
553	caa89b71-9a72-4500-8f60-e68a352cf32b	ADAPT PCO A/B HEMB S/R 01	21337	63	1.00	2025-10-24 00:47:10.125718	2025-10-24 00:47:10.125718	\N	\N	\N	simple	t	f	visible	\N	
554	517b6078-ea06-4495-b922-dfe9b60a2bdc	ADAPT PCO A/B HEMB S/R 01-1/2	21339	54	1.00	2025-10-24 00:47:10.142008	2025-10-24 00:47:10.142008	\N	\N	\N	simple	t	f	visible	\N	
555	9be6dd63-8df7-4b3f-974c-28c864b911c1	ADAPT PCO A/B HEMB S/R 02	21340	6	2.00	2025-10-24 00:47:10.157025	2025-10-24 00:47:10.157025	\N	\N	\N	simple	t	f	visible	\N	
556	318d3cd4-3c1b-446b-8665-33e3796c1f63	ADAPT PCO A/B HEMB S/R 04	21343	0	6.00	2025-10-24 00:47:10.170803	2025-10-24 00:47:10.170803	\N	\N	\N	simple	t	f	visible	\N	
557	8e916529-5350-4f59-84be-053040bcf426	ADAPT PCO A/B MACH S/R 1/2	21344	1399	0.00	2025-10-24 00:47:10.183154	2025-10-24 00:47:10.183154	\N	\N	\N	simple	t	f	visible	\N	
558	c9a942bb-dfba-4e9d-8e84-6b418d674e97	ADAPT PCO A/B MACH S/R 3/4	21345	967	0.00	2025-10-24 00:47:10.195416	2025-10-24 00:47:10.195416	\N	\N	\N	simple	t	f	visible	\N	
559	5236bfba-8998-456f-a910-d427508a15e6	ADAPT PCO A/B MACH S/R 01	21346	639	0.00	2025-10-24 00:47:10.207915	2025-10-24 00:47:10.207915	\N	\N	\N	simple	t	f	visible	\N	
560	8752619f-08e0-48e7-8362-1d798b5c8a72	ADAPT PCO A/B MACH S/R 01-1/2	21348	83	0.00	2025-10-24 00:47:10.220869	2025-10-24 00:47:10.220869	\N	\N	\N	simple	t	f	visible	\N	
561	7774e38b-7c68-4bc7-b278-c9b1a422e7d7	ADAPT PCO A/B MACH S/R 02	21349	76	1.00	2025-10-24 00:47:10.234964	2025-10-24 00:47:10.234964	\N	\N	\N	simple	t	f	visible	\N	
562	153f9749-63bb-4432-a2d4-686d1ee90463	ADAPT PCO A/B MACH S/R 03	21351	48	4.00	2025-10-24 00:47:10.247253	2025-10-24 00:47:10.247253	\N	\N	\N	simple	t	f	visible	\N	
563	6b8b329a-2975-42e4-835f-88453188a9e4	ADAPT PCO A/B MACH S/R 04	21352	23	7.00	2025-10-24 00:47:10.260182	2025-10-24 00:47:10.260182	\N	\N	\N	simple	t	f	visible	\N	
564	dc63dad5-4311-410b-b91d-1a6f04d5db4a	TAPON PCO A/B S 1/2	21356	354	0.00	2025-10-24 00:47:10.273052	2025-10-24 00:47:10.273052	\N	\N	\N	simple	t	f	visible	\N	
565	77188a88-2df4-46f2-a86f-5e4c6f01f975	TAPON PCO A/B S 3/4	21357	305	0.00	2025-10-24 00:47:10.278333	2025-10-24 00:47:10.278333	\N	\N	\N	simple	t	f	visible	\N	
566	ff33ec39-9889-4930-ae76-b798d8679914	TAPON PCO A/B S 1	21358	70	0.00	2025-10-24 00:47:10.291368	2025-10-24 00:47:10.291368	\N	\N	\N	simple	t	f	visible	\N	
567	f145f982-0688-4e0c-97bd-682e833ad42f	TAPON PCO A/B S 1-1/4	21359	415	0.00	2025-10-24 00:47:10.304959	2025-10-24 00:47:10.304959	\N	\N	\N	simple	t	f	visible	\N	
568	30d7299c-bc2f-4d79-9ef0-3dcf90e85200	TAPON PCO A/B S 1-1/2	21360	4	0.00	2025-10-24 00:47:10.318203	2025-10-24 00:47:10.318203	\N	\N	\N	simple	t	f	visible	\N	
569	dffc7f90-cf73-43b4-868c-118a0eff0f12	TAPON PCO A/B S 02	21361	28	1.00	2025-10-24 00:47:10.332552	2025-10-24 00:47:10.332552	\N	\N	\N	simple	t	f	visible	\N	
570	4b3db148-9779-401d-a341-453741d45605	TAPON PCO A/B S 4	21364	21	7.00	2025-10-24 00:47:10.348427	2025-10-24 00:47:10.348427	\N	\N	\N	simple	t	f	visible	\N	
571	7329ee55-5bb7-47d5-b0a3-99c6725e5e3d	TAPON PCO A/B R 3/4	21366	466	0.00	2025-10-24 00:47:10.362829	2025-10-24 00:47:10.362829	\N	\N	\N	simple	t	f	visible	\N	
572	9ab3e85c-8c9d-4dc1-acce-269f9d17c6bf	TAPON PCO A/B R 1-1/2	21368	108	1.00	2025-10-24 00:47:10.376774	2025-10-24 00:47:10.376774	\N	\N	\N	simple	t	f	visible	\N	
573	f12c867f-a0fa-40bb-afd2-05eafa78726c	REDUC PCO A/B S 3/4X1/2	21369	679	0.00	2025-10-24 00:47:10.391001	2025-10-24 00:47:10.391001	\N	\N	\N	simple	t	f	visible	\N	
574	95299752-240f-4746-b250-2af79d879d6e	REDUC PCO A/B S 01X1/2	21370	1	0.00	2025-10-24 00:47:10.404439	2025-10-24 00:47:10.404439	\N	\N	\N	simple	t	f	visible	\N	
575	46e3d2d0-a50e-4051-a68d-59a46e613e63	REDUC PCO A/B S 01X3/4	21371	410	0.00	2025-10-24 00:47:10.418379	2025-10-24 00:47:10.418379	\N	\N	\N	simple	t	f	visible	\N	
576	33be0d2b-180a-46f9-9b88-737114785c09	REDUC PCO A/B S 01-1/2X1/2	21375	289	0.00	2025-10-24 00:47:10.432562	2025-10-24 00:47:10.432562	\N	\N	\N	simple	t	f	visible	\N	
577	13a8f787-05c7-44bf-bc6d-7105c7fe519e	REDUC PCO A/B S 01-1/2X3/4	21376	200	0.00	2025-10-24 00:47:10.446054	2025-10-24 00:47:10.446054	\N	\N	\N	simple	t	f	visible	\N	
578	3a666a00-944c-4096-b7f0-9fcd1a97f6ec	REDUC PCO A/B S 1-1/2X1	21377	1	1.00	2025-10-24 00:47:10.461882	2025-10-24 00:47:10.461882	\N	\N	\N	simple	t	f	visible	\N	
579	b9ecd908-ca3d-44f8-8da6-683dd784c8a7	REDUC PCO A/B S 02X01	21381	53	2.00	2025-10-24 00:47:10.492013	2025-10-24 00:47:10.492013	\N	\N	\N	simple	t	f	visible	\N	
580	37e9a8dd-66ac-4d65-9c5a-be277e89ae7d	REDUC PCO A/B S 02X01-1/2	21383	101	1.00	2025-10-24 00:47:10.505221	2025-10-24 00:47:10.505221	\N	\N	\N	simple	t	f	visible	\N	
581	a36dc30f-543d-4e15-ac91-7e365dded7ab	REDUC PCO A/B S 02-1/2X01-1/2	21384	71	1.00	2025-10-24 00:47:10.518694	2025-10-24 00:47:10.518694	\N	\N	\N	simple	t	f	visible	\N	
582	1b6a25d6-5ce2-4aab-87e5-2a397371e149	REDUC PCO A/B S 02-1/2X02	21385	33	1.00	2025-10-24 00:47:10.531805	2025-10-24 00:47:10.531805	\N	\N	\N	simple	t	f	visible	\N	
583	ab2ffc99-73fb-4b10-8851-b69d4d6d25e1	REDUC PCO A/B S 03X02	21386	17	4.00	2025-10-24 00:47:10.544994	2025-10-24 00:47:10.544994	\N	\N	\N	simple	t	f	visible	\N	
584	e20ec0ff-c8b8-4c82-9bf6-8d9a04152954	REDUC PCO A/B S 04X03	21390	23	4.00	2025-10-24 00:47:10.558482	2025-10-24 00:47:10.558482	\N	\N	\N	simple	t	f	visible	\N	
585	4f6442a5-bdb7-4a75-a83a-e9c2ba5c34d1	REDUC PCO A/B S/R 3/4X1/2	21391	121	0.00	2025-10-24 00:47:10.564644	2025-10-24 00:47:10.564644	\N	\N	\N	simple	t	f	visible	\N	
586	ef40b5d3-3d1a-4567-9b6c-c55f6d798d77	REDUC PCO A/B S/R 01X1/2	21392	390	0.00	2025-10-24 00:47:10.578946	2025-10-24 00:47:10.578946	\N	\N	\N	simple	t	f	visible	\N	
587	887d8943-a446-4126-962d-c3d552f7a7ce	REDUC PCO A/B S/R 01X3/4	21393	222	0.00	2025-10-24 00:47:10.592917	2025-10-24 00:47:10.592917	\N	\N	\N	simple	t	f	visible	\N	
588	670098e2-f59a-47d3-87a7-e5f046ecabbf	REDUC PCO A/B S/R 01-1/4X 1/2	21394	524	0.00	2025-10-24 00:47:10.6065	2025-10-24 00:47:10.6065	\N	\N	\N	simple	t	f	visible	\N	
589	2f37218a-736f-42ee-b43f-0f4648d9347e	REDUC PCO A/B S/R 01-1/4X3/4	21395	872	0.00	2025-10-24 00:47:10.619948	2025-10-24 00:47:10.619948	\N	\N	\N	simple	t	f	visible	\N	
590	8efe945a-4124-4232-b360-80bc628f17f2	REDUC PCO A/B S/R 01-1/4X01	21396	739	0.00	2025-10-24 00:47:10.633857	2025-10-24 00:47:10.633857	\N	\N	\N	simple	t	f	visible	\N	
591	ead3c7c4-362e-47ff-a98f-a2fca9e9eb5d	REDUC PCO A/B S/R 01-1/2X1/2	21397	36	0.00	2025-10-24 00:47:10.647247	2025-10-24 00:47:10.647247	\N	\N	\N	simple	t	f	visible	\N	
592	028d65e0-2ce3-48e4-990e-f58902af700c	REDUC PCO A/B S/R 1-1/2X1-1/4	21400	815	0.00	2025-10-24 00:47:10.660547	2025-10-24 00:47:10.660547	\N	\N	\N	simple	t	f	visible	\N	
593	337b3a95-d1e0-4d0e-aa38-f9d9b92dec3c	REDUC PCO A/B S/R 02X01-1/4	21404	234	0.00	2025-10-24 00:47:10.676647	2025-10-24 00:47:10.676647	\N	\N	\N	simple	t	f	visible	\N	
594	ccbb5eea-3b4f-4cf6-bbf1-66250bd96026	UNION UNIV PCO A/B 1/2	21413	178	1.00	2025-10-24 00:47:10.690577	2025-10-24 00:47:10.690577	\N	\N	\N	simple	t	f	visible	\N	
595	c6e39169-ab91-425b-a894-c86f6e96472b	UNION UNIV PCO A/B 3/4	21414	281	2.00	2025-10-24 00:47:10.704576	2025-10-24 00:47:10.704576	\N	\N	\N	simple	t	f	visible	\N	
596	7d0f55d5-cc39-4c23-a0e6-f47a939217a0	UNION UNIV PCO A/B 1	21415	81	3.00	2025-10-24 00:47:10.718115	2025-10-24 00:47:10.718115	\N	\N	\N	simple	t	f	visible	\N	
597	44a92288-9bac-4f28-b5d5-fd089346ef4b	TEE PCO C-A/B 1/2	21416	615	0.00	2025-10-24 00:47:10.732219	2025-10-24 00:47:10.732219	\N	\N	\N	simple	t	f	visible	\N	
598	b77417eb-67ff-4212-92e3-52180ddcf4ca	TEE PCO C-A/B 3/4 927830	21417	195	0.00	2025-10-24 00:47:10.747057	2025-10-24 00:47:10.747057	\N	\N	\N	simple	t	f	visible	\N	
599	1195675b-a3ed-4c35-926a-d70a475d4677	CODO PCO C-A/B S 1/2X090	21418	1	0.00	2025-10-24 00:47:10.761851	2025-10-24 00:47:10.761851	\N	\N	\N	simple	t	f	visible	\N	
600	a997e212-f931-4a35-b7e4-f58144d40fe8	CODO PCO C-A/B S 3/4X090	21419	185	0.00	2025-10-24 00:47:10.776319	2025-10-24 00:47:10.776319	\N	\N	\N	simple	t	f	visible	\N	
601	ed927bee-22a4-4b9d-90c7-11926779d0e8	CODO PCO C-A/B S 1/2X045	21420	100	0.00	2025-10-24 00:47:10.790925	2025-10-24 00:47:10.790925	\N	\N	\N	simple	t	f	visible	\N	
602	b8eb0396-3ad8-4179-b694-be1a6b020f7d	CODO PCO C-A/B S 3/4X045	21421	95	0.00	2025-10-24 00:47:10.805074	2025-10-24 00:47:10.805074	\N	\N	\N	simple	t	f	visible	\N	
603	015f082d-46a1-4936-9834-a1c1e9ba7b43	UNION PCO C-A/B 1/2	21422	309	0.00	2025-10-24 00:47:10.817832	2025-10-24 00:47:10.817832	\N	\N	\N	simple	t	f	visible	\N	
604	26f4fc19-67e8-41e8-8249-4e11ee32ac93	UNION PCO C-A/B 3/4	21423	151	0.00	2025-10-24 00:47:10.831604	2025-10-24 00:47:10.831604	\N	\N	\N	simple	t	f	visible	\N	
605	6b1cc9d3-8242-4a72-a59f-ba5530e6deed	ADAPT PCO C-A/B HEMB R 3/4	21425	355	0.00	2025-10-24 00:47:10.845882	2025-10-24 00:47:10.845882	\N	\N	\N	simple	t	f	visible	\N	
606	f6fcba13-01cb-41fa-909f-5a8fc630dbf4	ADAPT PCO C-A/B HEMB R 3/4X1/4	21426	322	0.00	2025-10-24 00:47:10.858503	2025-10-24 00:47:10.858503	\N	\N	\N	simple	t	f	visible	\N	
607	7d7ce717-3ca8-428c-a2a6-bab75da69e01	ADAPT PCO C-A/B HEMB R 3/4X1/2	21427	42	0.00	2025-10-24 00:47:10.870672	2025-10-24 00:47:10.870672	\N	\N	\N	simple	t	f	visible	\N	
608	55292ed2-6068-4c88-b390-0e76b49e5c64	ADAPT PCO C-A/B MACH R 1/2	21428	335	0.00	2025-10-24 00:47:10.883839	2025-10-24 00:47:10.883839	\N	\N	\N	simple	t	f	visible	\N	
609	1c207405-c698-4377-a120-8f79493fa449	ADAPT PCO C-A/B MACH R 3/4	21429	221	0.00	2025-10-24 00:47:10.898875	2025-10-24 00:47:10.898875	\N	\N	\N	simple	t	f	visible	\N	
610	8fa08da0-d935-46e8-81a3-e6d1244adb05	TAPON PCO C-A/B S 1/2	21430	392	0.00	2025-10-24 00:47:10.912855	2025-10-24 00:47:10.912855	\N	\N	\N	simple	t	f	visible	\N	
611	9c22a2fd-9e48-4248-9b4c-8ac726256d20	TAPON PCO C-A/B S 3/4	21431	193	0.00	2025-10-24 00:47:10.942618	2025-10-24 00:47:10.942618	\N	\N	\N	simple	t	f	visible	\N	
612	210701e7-4fb4-4eb5-8067-d62c037038c8	REDUC PCO C-A/B S 3/4X1/2	21432	154	0.00	2025-10-24 00:47:10.956134	2025-10-24 00:47:10.956134	\N	\N	\N	simple	t	f	visible	\N	
613	12fc6caf-3897-4120-a49a-cc745c100a4f	UNION UNIV PCO C-A/B 1/2	21433	152	2.00	2025-10-24 00:47:10.970793	2025-10-24 00:47:10.970793	\N	\N	\N	simple	t	f	visible	\N	
614	36d43779-386e-4253-b646-b7af7643ba38	UNION UNIV PCO C-A/B 3/4	21434	52	2.00	2025-10-24 00:47:10.986947	2025-10-24 00:47:10.986947	\N	\N	\N	simple	t	f	visible	\N	
615	af04b177-fb10-468d-9f53-1cb82fdabdab	UNION PCO ELECT 1/2	21437	889	0.00	2025-10-24 00:47:11.001323	2025-10-24 00:47:11.001323	\N	\N	\N	simple	t	f	visible	\N	
616	ec96b52b-c88a-43c9-b1f4-6e8e4ad723fb	UNION PCO ELECT 3/4	21438	299	0.00	2025-10-24 00:47:11.014968	2025-10-24 00:47:11.014968	\N	\N	\N	simple	t	f	visible	\N	
617	3a58d3ad-7369-464e-a8ea-2f27293367fc	UNION PCO ELECT 1	21439	1	0.00	2025-10-24 00:47:11.028267	2025-10-24 00:47:11.028267	\N	\N	\N	simple	t	f	visible	\N	
618	22c84744-9e7e-4802-885f-389672d446c1	UNION PCO ELECT 1-1/2	21441	2376	0.00	2025-10-24 00:47:11.041798	2025-10-24 00:47:11.041798	\N	\N	\N	simple	t	f	visible	\N	
619	0464cf05-8b33-454b-a1d8-47e1867c9a49	TERMINAL PCO ELECT 1/2     C/TUERCA	21443	319	0.00	2025-10-24 00:47:11.057207	2025-10-24 00:47:11.057207	\N	\N	\N	simple	t	f	visible	\N	
620	6e3dce07-513b-47d2-b462-4880f7cca367	TERMINAL PCO ELECT 3/4     C/TUERCA	21444	519	0.00	2025-10-24 00:47:11.07214	2025-10-24 00:47:11.07214	\N	\N	\N	simple	t	f	visible	\N	
621	8d242e94-ac11-40f6-9127-cfa09c82c87c	TERMINAL PCO ELECT 1-1/2  C/TUERC	21447	3356	1.00	2025-10-24 00:47:11.087148	2025-10-24 00:47:11.087148	\N	\N	\N	simple	t	f	visible	\N	
622	bb78377a-0a10-420d-b93b-afd00769cd90	ADAPT PCO CAJETIN 1/2	21450	6646	0.00	2025-10-24 00:47:11.104258	2025-10-24 00:47:11.104258	\N	\N	\N	simple	t	f	visible	\N	
623	ea7586f8-d37d-4914-98ca-5376f4513bd3	ADAPT PCO CAJETIN 3/4	21451	904	0.00	2025-10-24 00:47:11.117476	2025-10-24 00:47:11.117476	\N	\N	\N	simple	t	f	visible	\N	
624	fdd31416-fd5e-4af6-8cd5-9864f5e3d5e8	ADAPT PCO CAJETIN 01	21452	191	0.00	2025-10-24 00:47:11.130583	2025-10-24 00:47:11.130583	\N	\N	\N	simple	t	f	visible	\N	
625	464cce1a-93cb-4b27-8d0f-65695001100c	CAJETIN PCO RECT 02X04	21453	209	2.00	2025-10-24 00:47:11.145052	2025-10-24 00:47:11.145052	\N	\N	\N	simple	t	f	visible	\N	
626	1c4b7778-e660-48b9-b58c-e87f8f8f13d7	TAPA CIEGA CUAD PCO ELECT 107X107	21455	238	1.00	2025-10-24 00:47:11.158279	2025-10-24 00:47:11.158279	\N	\N	\N	simple	t	f	visible	\N	
627	6bf868c9-f38f-42a0-8046-892857b2d4a0	CAJETIN PCO OCTOGONAL 100X100X47 927705	21457	636	1.00	2025-10-24 00:47:11.171623	2025-10-24 00:47:11.171623	\N	\N	\N	simple	t	f	visible	\N	
628	1a8fea9e-e34c-4ab8-bf55-215866223d65	ANILLO PVC 1 A/B ROSC CPP-AB03 SEMILIC	21503	179	0.00	2025-10-24 00:47:11.184925	2025-10-24 00:47:11.184925	\N	\N	\N	simple	t	f	visible	\N	
629	62ed2505-3da3-4a3e-a68f-cf2ad2f05b97	CODO UNIT AN 02X45 ( 50MM) C/C UNITECA	21505	135	0.00	2025-10-24 00:47:11.198833	2025-10-24 00:47:11.198833	\N	\N	\N	simple	t	f	visible	\N	
630	8402c524-4b62-473f-bfc6-d64c515eb2ae	CODO UNIT AN  02X90 (50MM)  C/C UNITECA	21514	1618	0.00	2025-10-24 00:47:11.213255	2025-10-24 00:47:11.213255	\N	\N	\N	simple	t	f	visible	\N	
631	78f3f7dd-32c9-44ee-b0ce-7858726ab137	ANILLO PVC 1/2 A/B ROSC CPP-AB01 SEMILIC	21519	157	0.00	2025-10-24 00:47:11.226476	2025-10-24 00:47:11.226476	\N	\N	\N	simple	t	f	visible	\N	
632	1af1084e-0bd3-4de1-b314-dfc4955c1307	ANILLO PVC 3/4 A/B ROSC CPP-AB02 SEMILIC	21520	62	0.00	2025-10-24 00:47:11.240652	2025-10-24 00:47:11.240652	\N	\N	\N	simple	t	f	visible	\N	
633	4c629a6a-265c-499c-9452-7e0c87dddcb8	BUSHING PVC 1X3/4 A/B ROSC CPP-AB15 SEMILIC	21529	263	0.00	2025-10-24 00:47:11.254162	2025-10-24 00:47:11.254162	\N	\N	\N	simple	t	f	visible	\N	
634	85c7c3a7-89e1-4b59-bfa4-8e4382e338b9	CODO PVC 1/2X90 A/B ROSC CPP-AB04 SEMILIC	21531	214	0.00	2025-10-24 00:47:11.26813	2025-10-24 00:47:11.26813	\N	\N	\N	simple	t	f	visible	\N	
635	6fc6d982-0c7d-4464-853d-6b87f7fc99f3	CODO PVC 3/4X90 A/B ROS CPP-AB05 SEMILIC	21533	124	0.00	2025-10-24 00:47:11.283866	2025-10-24 00:47:11.283866	\N	\N	\N	simple	t	f	visible	\N	
636	32a56454-cbc4-4837-9431-0a7d6b3bf68f	NIPLE PVC A/B  1/2X4 ( 10 CM)	21545	1	0.00	2025-10-24 00:47:11.298659	2025-10-24 00:47:11.298659	\N	\N	\N	simple	t	f	visible	\N	
637	6376ea01-dc98-4558-899b-3a6d7d2638e7	NIPLE PVC A/B  3/4X2-1/2 22-34-041	21548	146	0.00	2025-10-24 00:47:11.313055	2025-10-24 00:47:11.313055	\N	\N	\N	simple	t	f	visible	\N	
638	3e527b98-0fd1-4781-aecd-4a337de1ef18	NIPLE PVC A/B  3/4X3 ( 8 CM)	21549	18	0.00	2025-10-24 00:47:11.326608	2025-10-24 00:47:11.326608	\N	\N	\N	simple	t	f	visible	\N	
639	666b6944-1251-4f57-b60e-d3d2c71cca2f	NIPLE PVC 1/2 A/B ROSC CORRIDO CPP-AB25 SEMILIC	21554	140	0.00	2025-10-24 00:47:11.34029	2025-10-24 00:47:11.34029	\N	\N	\N	simple	t	f	visible	\N	
640	3bcd9e40-f7cc-4f4e-bdd1-d5215dae684b	NIPLE PVC A/B  1/2X10	21556	2	0.00	2025-10-24 00:47:11.353554	2025-10-24 00:47:11.353554	\N	\N	\N	simple	t	f	visible	\N	
641	f91519cf-00d0-49a8-b83f-a0638e94c08a	JUNTA DRESSER PVC A/B  1/2 JUN-D01	21557	95	1.00	2025-10-24 00:47:11.366025	2025-10-24 00:47:11.366025	\N	\N	\N	simple	t	f	visible	\N	
642	cabb8fb0-3994-4ab8-8437-5f52240f4673	JUNTA DRESSER PVC A/B  3/4 JUN-D02	21558	149	2.00	2025-10-24 00:47:11.378859	2025-10-24 00:47:11.378859	\N	\N	\N	simple	t	f	visible	\N	
643	6343388a-65ab-4645-94da-04e70c8e0a7b	JUNTA DRESSER PVC A/B 3/4 FEMOI JUN12	21561	28	1.00	2025-10-24 00:47:11.409727	2025-10-24 00:47:11.409727	\N	\N	\N	simple	t	f	visible	\N	
644	f0e3b5d1-7c20-4223-806c-21043ac5f23e	TAPON HEMBR PVC 1/2 A/B ROSC CPP-AB22 REMILIC	21562	120	0.00	2025-10-24 00:47:11.424072	2025-10-24 00:47:11.424072	\N	\N	\N	simple	t	f	visible	\N	
645	3efe0c8f-e73f-493c-b2b8-8c2300bcf5a0	TAPON HEMBR PVC 3/4 A/B ROSC CPP-AB23 SEMILIC	21563	19	0.00	2025-10-24 00:47:11.438873	2025-10-24 00:47:11.438873	\N	\N	\N	simple	t	f	visible	\N	
646	d0b8682d-18c0-47ca-a7c2-f9ea832e2192	TAPON HEMBR PVC 1 A/B ROSC CPP-AB24 SEMILIC	21564	9	0.00	2025-10-24 00:47:11.45257	2025-10-24 00:47:11.45257	\N	\N	\N	simple	t	f	visible	\N	
647	30b59b80-a7b4-442d-b85a-4ad2e0d84483	TAPON MACH PVC 1/2 A/B ROSC CPP-AB16 SEMILIC	21567	77	0.00	2025-10-24 00:47:11.466049	2025-10-24 00:47:11.466049	\N	\N	\N	simple	t	f	visible	\N	
648	6444b30d-4502-4d78-b273-12fa862e733d	TAPON MACH PVC 3/4 A/B CPP-AB17 SEMILIC	21568	1770	0.00	2025-10-24 00:47:11.48142	2025-10-24 00:47:11.48142	\N	\N	\N	simple	t	f	visible	\N	
649	fbcb78c3-325a-4be2-bc1d-3085ee2776de	TAPON MACH PVC A/B 1-1/2	21570	8	0.00	2025-10-24 00:47:11.496372	2025-10-24 00:47:11.496372	\N	\N	\N	simple	t	f	visible	\N	
650	a7e7d0f1-7ba1-4fe7-86b2-b0ceea08edb3	TEE PVC 1/2 ROSC A/B CPP-AB07 SEMILIC	21572	93	0.00	2025-10-24 00:47:11.510326	2025-10-24 00:47:11.510326	\N	\N	\N	simple	t	f	visible	\N	
651	3a5d7345-e933-4a35-967f-92c73e6d76c9	CODO PVC 1X90 A/B ROSC CPP-AB06 SEMILIC	21576	115	0.00	2025-10-24 00:47:11.523871	2025-10-24 00:47:11.523871	\N	\N	\N	simple	t	f	visible	\N	
652	585b2dbf-4144-4f8a-8616-8c13222e20c1	VACIO	21589	0	0.00	2025-10-24 00:47:11.538669	2025-10-24 00:47:11.538669	\N	\N	\N	simple	t	f	visible	\N	
653	39abf872-33ed-488a-b7cf-ddea0780baf3	CODO UNIT AN  04X45 C/E (110MM) UNITECA	22244	54	3.00	2025-10-24 00:47:11.552907	2025-10-24 00:47:11.552907	\N	\N	\N	simple	t	f	visible	\N	
654	2fcb07f8-98a3-4fab-bc10-595b0b6f2cc5	TEE UNIT AN RED 03X02 (75X50MM) UNITECA	22248	413	2.00	2025-10-24 00:47:11.571206	2025-10-24 00:47:11.571206	\N	\N	\N	simple	t	f	visible	\N	
655	ee9c2aa3-cd3c-42ad-81f1-f9fa99874a2f	YEE UNIT AN 03X03 (75MM) UNITECA	22256	27	4.00	2025-10-24 00:47:11.58554	2025-10-24 00:47:11.58554	\N	\N	\N	simple	t	f	visible	\N	
656	7e8366e8-1ebd-4eef-a929-2eed723cb1be	CODO UNIT AB  1/2X90 SOLD UNITECA	22524	3296	0.00	2025-10-24 00:47:11.599776	2025-10-24 00:47:11.599776	\N	\N	\N	simple	t	f	visible	\N	
657	9625ed03-483f-4660-9a74-addd73b0b6c4	TEE UNIT AB 1/2 SOLD UNITECA	22525	11	0.00	2025-10-24 00:47:11.613788	2025-10-24 00:47:11.613788	\N	\N	\N	simple	t	f	visible	\N	
658	d9d4e0b6-7b8f-4ed3-bcbf-e2a912198e35	CODO UNIT AB 3/4X45 SOLD UNITECA	23566	121	0.00	2025-10-24 00:47:11.629377	2025-10-24 00:47:11.629377	\N	\N	\N	simple	t	f	visible	\N	
659	9e053b49-536f-4ea1-aceb-ec12ddabed90	TEE UNIT AN 03X03 (75MM) UNITECA	25138	511	3.00	2025-10-24 00:47:11.646557	2025-10-24 00:47:11.646557	\N	\N	\N	simple	t	f	visible	\N	
660	169e1055-962b-498a-857a-e4fac239f6b2	TEE UNIT AN 04X03 (110X75) UNITECA	25375	59	6.00	2025-10-24 00:47:11.663603	2025-10-24 00:47:11.663603	\N	\N	\N	simple	t	f	visible	\N	
661	0789e239-6fd7-4531-99bd-fd841470cbde	CODO UNIT AB 1X90 SOLD UNITECA	25384	0	0.00	2025-10-24 00:47:11.680511	2025-10-24 00:47:11.680511	\N	\N	\N	simple	t	f	visible	\N	
662	bbe92d7a-be01-4979-8dfc-f981414e10a2	UNION UNIT ELECT 1/2 UNITECA	25405	496	0.00	2025-10-24 00:47:11.695731	2025-10-24 00:47:11.695731	\N	\N	\N	simple	t	f	visible	\N	
663	36a39169-66ba-480b-a5be-e9dcdaa5e017	TEE UNIT AB 3/4 SOLD UNITECA	25554	1518	0.00	2025-10-24 00:47:11.713769	2025-10-24 00:47:11.713769	\N	\N	\N	simple	t	f	visible	\N	
664	5f370da2-4cb2-4dd2-a7f4-cc4abd404d51	TEE UNIT AB 1 SOLD UNITECA	25555	626	1.00	2025-10-24 00:47:11.729173	2025-10-24 00:47:11.729173	\N	\N	\N	simple	t	f	visible	\N	
665	a7ad2e16-790c-4a66-968c-9c295d5bed04	ADAPT PVC AB MACH S/R 3/4  UNIT	25566	1583	0.00	2025-10-24 00:47:11.745022	2025-10-24 00:47:11.745022	\N	\N	\N	simple	t	f	visible	\N	
666	7239955e-19c4-40f5-9858-809c0f9f0500	SPUD DE  1/2" PVC NEGRO	25570	20	0.00	2025-10-24 00:47:11.78058	2025-10-24 00:47:11.78058	\N	\N	\N	simple	t	f	visible	\N	
667	355360c4-85c1-449a-a1dc-96ab9aa261e5	SPUD DE 3/4 PLASTICO NEGRO	25582	1	1.00	2025-10-24 00:47:11.79787	2025-10-24 00:47:11.79787	\N	\N	\N	simple	t	f	visible	\N	
668	1cdba7ec-1693-42a2-875a-2a513b38bc40	ADAPT UNIT AB HEMBR S 3/4  UNIT	25588	869	0.00	2025-10-24 00:47:11.814267	2025-10-24 00:47:11.814267	\N	\N	\N	simple	t	f	visible	\N	
669	62a76d9d-81d5-4f73-9cbb-2c2606447ecc	TAPON UNIT AB S 1/2 UNIT	25596	3870	0.00	2025-10-24 00:47:11.828653	2025-10-24 00:47:11.828653	\N	\N	\N	simple	t	f	visible	\N	
670	afd6d100-dcf6-4b3d-a3e8-e814e5d9b304	REDUC UNIT A/B S 3/4X1/2 UNIT	25659	439	0.00	2025-10-24 00:47:11.845504	2025-10-24 00:47:11.845504	\N	\N	\N	simple	t	f	visible	\N	
671	a20840e0-0a54-4605-8edd-df76dfd48e67	REDUC UNIT A/B S/R 3/4X1/2	25662	129	0.00	2025-10-24 00:47:11.862952	2025-10-24 00:47:11.862952	\N	\N	\N	simple	t	f	visible	\N	
672	63049ccb-6225-4c77-8480-c199ae385b7e	CODO PCO C-A/B 01X45	25939	14	0.00	2025-10-24 00:47:11.878794	2025-10-24 00:47:11.878794	\N	\N	\N	simple	t	f	visible	\N	
673	4399dd00-e368-471e-b784-9f238c9a51dc	EMPALME P/CANAL PVC 4" TINAPLAS	26317	85	2.00	2025-10-24 00:47:11.893912	2025-10-24 00:47:11.893912	\N	\N	\N	simple	t	f	visible	\N	
674	d79fee37-425e-4350-86d4-2cb8a8459194	TERMINAL UNIT ELECT 1/2 C/TUERCA	26413	5471	0.00	2025-10-24 00:47:11.908954	2025-10-24 00:47:11.908954	\N	\N	\N	simple	t	f	visible	\N	
675	02f4a23c-5b65-47fa-a521-3bda7f0e87a2	TAPON PCO A/B R 02	26449	37	1.00	2025-10-24 00:47:11.926319	2025-10-24 00:47:11.926319	\N	\N	\N	simple	t	f	visible	\N	
676	fb45e86c-2b25-4ec2-b83e-ec05f9aa043c	VALVULA BOLA PCO HEMB S 1/2 S/UNI UNIV	26541	17	5.00	2025-10-24 00:47:11.938646	2025-10-24 00:47:11.938646	\N	\N	\N	simple	t	f	visible	\N	
677	b3fa046e-ea85-44bf-9f89-f66c6706b813	VALVULA BOLA PCO HEMB S 3/4 S/UNI UNIV	26542	10	7.00	2025-10-24 00:47:11.952218	2025-10-24 00:47:11.952218	\N	\N	\N	simple	t	f	visible	\N	
678	fea9d220-327b-4c68-8e30-eaed3f45d0ff	VALVULA BOLA PCO HEMB S 1 S/UNI UNIV	26543	4	10.00	2025-10-24 00:47:11.965028	2025-10-24 00:47:11.965028	\N	\N	\N	simple	t	f	visible	\N	
679	1d09c621-430d-418b-a182-2512122ff873	SPUD DE 1 1/2 PCO A/A C/J JUNTAS SELLA	26744	122	6.00	2025-10-24 00:47:11.977261	2025-10-24 00:47:11.977261	\N	\N	\N	simple	t	f	visible	\N	
680	1d26c172-b022-41dc-8354-ea863841f4c4	CAJETIN UNIT 4X1/2X3/4 OCTOGON UNITECA	26750	1	1.00	2025-10-24 00:47:11.989847	2025-10-24 00:47:11.989847	\N	\N	\N	simple	t	f	visible	\N	
681	5acca809-5493-47f3-ab23-c5decac15883	SPUD DE 1" P/TANQUE PLASTICO BLANCO/NEGRO	27412	16	1.00	2025-10-24 00:47:12.00177	2025-10-24 00:47:12.00177	\N	\N	\N	simple	t	f	visible	\N	
682	5e5a28e1-8044-4763-8ecd-5f56caf74990	JUNTA DRESSER PVC A/B 1" TBA	27432	1	4.00	2025-10-24 00:47:12.013884	2025-10-24 00:47:12.013884	\N	\N	\N	simple	t	f	visible	\N	
683	6031c0d7-1e97-4280-ae42-77f36ddae4e4	NIPLE PVC A/B  1/2X7 (18CM)	28049	74	0.00	2025-10-24 00:47:12.025864	2025-10-24 00:47:12.025864	\N	\N	\N	simple	t	f	visible	\N	
684	a7cd1106-29fb-4d19-a17d-7a812c611fb1	NIPLE PVC A/B  1/2X5 (13CM)	29092	1	0.00	2025-10-24 00:47:12.037947	2025-10-24 00:47:12.037947	\N	\N	\N	simple	t	f	visible	\N	
685	ed9ac59b-acaf-4e69-9001-15ba8ed95253	NIPLE PVC A/B  3/4X4 (10cm)	29133	25	0.00	2025-10-24 00:47:12.0522	2025-10-24 00:47:12.0522	\N	\N	\N	simple	t	f	visible	\N	
686	78d4a923-a0ae-4036-9894-3f2f9d3d9f43	TAPON PCO A/B R 03	29214	45	3.00	2025-10-24 00:47:12.064934	2025-10-24 00:47:12.064934	\N	\N	\N	simple	t	f	visible	\N	
687	0d2c560f-f204-467e-a39b-8c30c55b6a9f	TAPON PCO A/B R 04	29215	19	5.00	2025-10-24 00:47:12.078214	2025-10-24 00:47:12.078214	\N	\N	\N	simple	t	f	visible	\N	
688	71560bc4-78a2-4f23-8c68-ddee334d07bb	NIPLE PVC A/B  1/2X8 (20CM)	29235	37	0.00	2025-10-24 00:47:12.091412	2025-10-24 00:47:12.091412	\N	\N	\N	simple	t	f	visible	\N	
689	4ab20185-a47e-4061-9a8d-fccbe6638cf4	TEE UNIT AN 50 C/C	30194	3853	1.00	2025-10-24 00:47:12.10369	2025-10-24 00:47:12.10369	\N	\N	\N	simple	t	f	visible	\N	
690	1cd39691-9f5e-44e9-bd1e-8a3fb41529c1	CODO UNIT AN 75X45 C/C	30195	3	1.00	2025-10-24 00:47:12.115993	2025-10-24 00:47:12.115993	\N	\N	\N	simple	t	f	visible	\N	
691	1dcea01c-2b60-40c1-9184-4b87b9971da5	UNION UNIV PVC 1/2 A/B SOLD UNI-25/CPV-AF22 SEMILIC	31807	20	0.00	2025-10-24 00:47:12.127932	2025-10-24 00:47:12.127932	\N	\N	\N	simple	t	f	visible	\N	
692	bbc2e545-a106-48c6-8134-a1a584eaf96d	UNION UNIV PVC A/B  3/4" SOLD UNI-26	31808	31	1.00	2025-10-24 00:47:12.14184	2025-10-24 00:47:12.14184	\N	\N	\N	simple	t	f	visible	\N	
693	db6d6730-ced1-4f8d-923c-b8cabb39565d	UNION UNIV PVC 1 A/B SOLD UNI-27/CPV-AF24 SEMILIC	31809	35	1.00	2025-10-24 00:47:12.154147	2025-10-24 00:47:12.154147	\N	\N	\N	simple	t	f	visible	\N	
694	ead80ae1-3eef-436d-a6cb-8788854cb0ab	UNION UNIV PVC A/B  1/2" ROSC UNI-20	31810	57	0.00	2025-10-24 00:47:12.166147	2025-10-24 00:47:12.166147	\N	\N	\N	simple	t	f	visible	\N	
695	9024bf7a-eaa4-4d41-9cc8-bde56da62208	UNION UNIV PVC A/B  3/4" ROSC UNI-21	31811	76	0.00	2025-10-24 00:47:12.178176	2025-10-24 00:47:12.178176	\N	\N	\N	simple	t	f	visible	\N	
696	75ee277d-df11-46f6-bb36-b05dea01468d	UNION UNIV PVC A/B  1" ROSC UNI-22	31812	108	1.00	2025-10-24 00:47:12.190662	2025-10-24 00:47:12.190662	\N	\N	\N	simple	t	f	visible	\N	
697	7db9607b-a407-4e1a-92b3-3763d7bd0930	CODO TBA A/B 1/2X90	32000	306	0.00	2025-10-24 00:47:12.220239	2025-10-24 00:47:12.220239	\N	\N	\N	simple	t	f	visible	\N	
698	a24e3a86-f391-461c-b02b-9c5b12a0a405	CODO TBA A/B 2X90	32004	574	5.00	2025-10-24 00:47:12.235238	2025-10-24 00:47:12.235238	\N	\N	\N	simple	t	f	visible	\N	
699	7c672baa-a042-4e96-b183-6d76283f0ace	CODO TBA A/B 4X90	32006	91	21.00	2025-10-24 00:47:12.249386	2025-10-24 00:47:12.249386	\N	\N	\N	simple	t	f	visible	\N	
700	fe6a23d0-b539-466e-b5a4-7940456d2cd9	CODO TBA A/B 1/2X45	32007	4	0.00	2025-10-24 00:47:12.264552	2025-10-24 00:47:12.264552	\N	\N	\N	simple	t	f	visible	\N	
701	5811a9bb-1c67-405d-b684-b231bef5d2ea	CODO TBA A/B 3/4X45	32008	2	0.00	2025-10-24 00:47:12.278661	2025-10-24 00:47:12.278661	\N	\N	\N	simple	t	f	visible	\N	
702	ac28412c-7db0-41d9-929b-a5030b6351b3	CODO TBA A/B 1X45	32009	1	0.00	2025-10-24 00:47:12.29229	2025-10-24 00:47:12.29229	\N	\N	\N	simple	t	f	visible	\N	
703	8ceab1fd-57d4-4203-961c-91b1ad5058e5	CODO TBA A/B 2X45	32011	52	3.00	2025-10-24 00:47:12.306832	2025-10-24 00:47:12.306832	\N	\N	\N	simple	t	f	visible	\N	
704	9175a8e0-b5e2-4fa2-bbd8-a87e3fabde3a	TEE TBA A/B 1/2	32012	83	0.00	2025-10-24 00:47:12.320408	2025-10-24 00:47:12.320408	\N	\N	\N	simple	t	f	visible	\N	
705	8affdae4-adad-46a4-bace-f095f27fb167	TEE TBA A/B 3/4	32013	151	0.00	2025-10-24 00:47:12.334479	2025-10-24 00:47:12.334479	\N	\N	\N	simple	t	f	visible	\N	
706	a6b70110-ba9a-44b2-ae19-14bc93b5704d	TEE TBA A/B 1	32014	1	1.00	2025-10-24 00:47:12.348326	2025-10-24 00:47:12.348326	\N	\N	\N	simple	t	f	visible	\N	
707	afeca37d-7d0f-4717-87e5-31365cab1187	TEE TBA A/B 1-1/2	32015	60	2.00	2025-10-24 00:47:12.361116	2025-10-24 00:47:12.361116	\N	\N	\N	simple	t	f	visible	\N	
708	56b79e36-c5aa-4f8c-8ed2-628b0425fe94	TEE TBA A/B 2	32016	2	6.00	2025-10-24 00:47:12.373313	2025-10-24 00:47:12.373313	\N	\N	\N	simple	t	f	visible	\N	
709	40a52286-5853-4db1-a617-aa586279d0d5	UNION TBA A/B 1/2	32019	842	0.00	2025-10-24 00:47:12.385612	2025-10-24 00:47:12.385612	\N	\N	\N	simple	t	f	visible	\N	
710	b48ce911-5160-499c-9d2b-fd820363edc8	UNION TBA A/B 3/4	32020	127	0.00	2025-10-24 00:47:12.39784	2025-10-24 00:47:12.39784	\N	\N	\N	simple	t	f	visible	\N	
711	3da3e3f9-ad2b-4b49-aac1-c07f63cc64f3	UNION TBA A/B 1	32021	180	0.00	2025-10-24 00:47:12.410042	2025-10-24 00:47:12.410042	\N	\N	\N	simple	t	f	visible	\N	
712	77e0f78a-0278-49e6-b159-1a65ba916fb5	UNION TBA A/B 1-1/2	32022	1	1.00	2025-10-24 00:47:12.422032	2025-10-24 00:47:12.422032	\N	\N	\N	simple	t	f	visible	\N	
713	30575b46-b47b-47bd-84b1-fe07173d2412	UNION TBA A/B 2 S CXC	32023	21	1.00	2025-10-24 00:47:12.434036	2025-10-24 00:47:12.434036	\N	\N	\N	simple	t	f	visible	\N	
714	5b085529-9c43-4562-b744-59cd96c651a0	UNION TBA A/B 4	32026	4	7.00	2025-10-24 00:47:12.446116	2025-10-24 00:47:12.446116	\N	\N	\N	simple	t	f	visible	\N	
715	ee383afb-7201-46a2-b8c4-577393cb0994	ADAPT TBA A/B HEMBRA 1/2 S/R	32027	46	0.00	2025-10-24 00:47:12.458423	2025-10-24 00:47:12.458423	\N	\N	\N	simple	t	f	visible	\N	
716	b33cd3a6-fa05-48e0-88b2-b7619577351d	ADAPT TBA A/B HEMBRA 3/4	32028	867	0.00	2025-10-24 00:47:12.474082	2025-10-24 00:47:12.474082	\N	\N	\N	simple	t	f	visible	\N	
717	a613deb3-c82f-4cef-890c-5a2c47ae75e6	ADAPT TBA A/B HEMBRA 1 R	32029	309	0.00	2025-10-24 00:47:12.486624	2025-10-24 00:47:12.486624	\N	\N	\N	simple	t	f	visible	\N	
718	0d742ea9-5a73-4142-9f56-d3cef29ebfa7	ADAPT TBA A/B HEMBRA 1-1/2	32030	345	1.00	2025-10-24 00:47:12.499613	2025-10-24 00:47:12.499613	\N	\N	\N	simple	t	f	visible	\N	
719	22f0a135-f3d2-4e97-8d6f-65b712f66e22	ADAPT TBA A/B HEMBRA 2	32031	205	1.00	2025-10-24 00:47:12.511995	2025-10-24 00:47:12.511995	\N	\N	\N	simple	t	f	visible	\N	
720	ea9a5305-4e33-437d-8766-f89251da385d	ADAPT TBA A/B HEMBRA 3	32032	29	2.00	2025-10-24 00:47:12.524195	2025-10-24 00:47:12.524195	\N	\N	\N	simple	t	f	visible	\N	
721	996aef6d-b5b4-46a0-a9c7-97a49267f65a	ADAPT TBA A/B MACHO 1/2	32034	161	0.00	2025-10-24 00:47:12.536157	2025-10-24 00:47:12.536157	\N	\N	\N	simple	t	f	visible	\N	
722	4252480c-45a5-4ebe-a3d0-a3e04ea1da79	ADAPT TBA A/B MACHO 3/4	32035	269	0.00	2025-10-24 00:47:12.54164	2025-10-24 00:47:12.54164	\N	\N	\N	simple	t	f	visible	\N	
723	58a634c4-96f1-4be1-909c-a7fdeb9df79f	ADAPT TBA A/B MACHO 1	32036	103	0.00	2025-10-24 00:47:12.55579	2025-10-24 00:47:12.55579	\N	\N	\N	simple	t	f	visible	\N	
724	22171952-85c9-46ea-aea2-4193bd175b84	ADAPT TBA A/B MACHO 1-1/2 S/R	32037	3	0.00	2025-10-24 00:47:12.575237	2025-10-24 00:47:12.575237	\N	\N	\N	simple	t	f	visible	\N	
725	c0746e0d-f719-4c1c-8db0-dbc525ecb6c9	ADAPT TBA A/B MACHO 2 S/R	32038	20	1.00	2025-10-24 00:47:12.591922	2025-10-24 00:47:12.591922	\N	\N	\N	simple	t	f	visible	\N	
726	fc89cbdc-1900-465d-9f74-a52e9f4ce5f8	ADAPT TBA A/B MACHO 3	32039	43	4.00	2025-10-24 00:47:12.605497	2025-10-24 00:47:12.605497	\N	\N	\N	simple	t	f	visible	\N	
727	b0ebdfa0-aec4-414d-98c1-0d3385cfe648	ADAPT TBA A/B MACHO RED 3/4X1/2	32041	95	0.00	2025-10-24 00:47:12.618342	2025-10-24 00:47:12.618342	\N	\N	\N	simple	t	f	visible	\N	
728	65fb748d-02f5-40a4-870b-b00d43f57016	TAPON TBA HEMBR A/B S 1	32044	123	0.00	2025-10-24 00:47:12.631614	2025-10-24 00:47:12.631614	\N	\N	\N	simple	t	f	visible	\N	
729	67992dc8-febd-4ea2-810e-e76fb0d1edd9	TAPON TBA MACHO A/B R 3/4	32046	2791	0.00	2025-10-24 00:47:12.661436	2025-10-24 00:47:12.661436	\N	\N	\N	simple	t	f	visible	\N	
730	4d5ce676-4d99-42b6-a2ce-a34c1a3b499d	TAPON TBA HEMBR A/B R 1-1/2	32048	40	0.00	2025-10-24 00:47:12.674755	2025-10-24 00:47:12.674755	\N	\N	\N	simple	t	f	visible	\N	
731	3a11adff-217b-4b86-8f71-81e8edfd1f9f	UNION UNIV TBA A/B S 1/2	32050	22	1.00	2025-10-24 00:47:12.687846	2025-10-24 00:47:12.687846	\N	\N	\N	simple	t	f	visible	\N	
732	be2a3125-269c-4315-8c68-79b3cc3fe369	REDUCC TBA A/B S 3/4X1/2 BUJE	32064	1561	0.00	2025-10-24 00:47:12.702638	2025-10-24 00:47:12.702638	\N	\N	\N	simple	t	f	visible	\N	
733	cf4f188c-462b-45fb-87b9-47be9126e0ff	REDUCC LINEAL TBA A/B S 3/4X1/2	32067	161	0.00	2025-10-24 00:47:12.716341	2025-10-24 00:47:12.716341	\N	\N	\N	simple	t	f	visible	\N	
734	248e70ce-26c8-433a-a425-99645c3b7124	REDUCC TBA A/B S 1X1/2	32068	21	0.00	2025-10-24 00:47:12.7293	2025-10-24 00:47:12.7293	\N	\N	\N	simple	t	f	visible	\N	
735	73420a13-ab40-42f8-a432-50699bf64d67	REDUCC TBA A/B S 1-1/2X1/2	32070	87	0.00	2025-10-24 00:47:12.743166	2025-10-24 00:47:12.743166	\N	\N	\N	simple	t	f	visible	\N	
736	42ded5c0-579f-4ded-9c5d-f504c55f2fc0	REDUCC TBA A/B S 1-1/2X3/4	32071	161	0.00	2025-10-24 00:47:12.758415	2025-10-24 00:47:12.758415	\N	\N	\N	simple	t	f	visible	\N	
737	09391f40-8545-4ed6-afca-0c485342e91a	REDUCC TBA A/B S 1-1/2X1	32072	1	0.00	2025-10-24 00:47:12.771261	2025-10-24 00:47:12.771261	\N	\N	\N	simple	t	f	visible	\N	
738	d3d93d38-18ec-4dce-9149-0eef1d8099ed	REDUCC TBA A/B S 2X1/2	32073	66	0.00	2025-10-24 00:47:12.78342	2025-10-24 00:47:12.78342	\N	\N	\N	simple	t	f	visible	\N	
739	be037b3e-6c8e-4527-a77e-e255b5c69980	REDUCC TBA A/B S 2X1	32075	64	1.00	2025-10-24 00:47:12.796366	2025-10-24 00:47:12.796366	\N	\N	\N	simple	t	f	visible	\N	
740	abc437cb-b075-4468-a7b6-4ec22c4808da	TAPON TBA MACHO A/B R 1	32079	141	0.00	2025-10-24 00:47:12.80872	2025-10-24 00:47:12.80872	\N	\N	\N	simple	t	f	visible	\N	
741	aabd4b2a-3a91-4689-9104-263525c0c56c	TAPON TBA MACHO A/B R 1-1/2	32080	13	0.00	2025-10-24 00:47:12.820681	2025-10-24 00:47:12.820681	\N	\N	\N	simple	t	f	visible	\N	
742	360973d7-ed7e-4fbd-988b-e4b6cb08f0b7	TAPON TBA MACHO A/B R 2	32081	2	1.00	2025-10-24 00:47:12.832624	2025-10-24 00:47:12.832624	\N	\N	\N	simple	t	f	visible	\N	
743	fcec0d79-4894-4c19-9512-613c6c75b262	VALVULA BOLA TBA R 1/2 C/UNION	32082	264	4.00	2025-10-24 00:47:12.844634	2025-10-24 00:47:12.844634	\N	\N	\N	simple	t	f	visible	\N	
744	511ffd18-26da-4fd1-8d30-b2eab2390bf8	VALVULA BOLA TBA R 1  C/UNION	32084	18	10.00	2025-10-24 00:47:12.857826	2025-10-24 00:47:12.857826	\N	\N	\N	simple	t	f	visible	\N	
745	8688d81b-3dae-4ef1-aa59-d49bc5c8d843	VALVULA BOLA TBA R  2-1/2 C/UNION	32087	5	54.00	2025-10-24 00:47:12.871484	2025-10-24 00:47:12.871484	\N	\N	\N	simple	t	f	visible	\N	
746	bd7ff1e8-db78-4f42-b045-f9696de799e0	VALVULA BOLA TBA R  4 C/UNION	32089	1	197.00	2025-10-24 00:47:12.884375	2025-10-24 00:47:12.884375	\N	\N	\N	simple	t	f	visible	\N	
747	00628781-fde4-462f-a0db-33fa7318d7f3	VALVULA BOLA TBA R 3/4 S/UNION	32091	1	3.00	2025-10-24 00:47:12.898198	2025-10-24 00:47:12.898198	\N	\N	\N	simple	t	f	visible	\N	
748	a929cc92-e26b-42f4-8040-6edecb09794c	CODO TBA C-A/B S 3/4X90	32104	1123	0.00	2025-10-24 00:47:12.912091	2025-10-24 00:47:12.912091	\N	\N	\N	simple	t	f	visible	\N	
749	a8727a3d-b825-4ba7-ac99-f14a24851a14	CODO TBA C-A/B S 1/2X45	32106	451	0.00	2025-10-24 00:47:12.925328	2025-10-24 00:47:12.925328	\N	\N	\N	simple	t	f	visible	\N	
750	3fbed131-0426-4d52-9654-67ffd8093035	CODO TBA C-A/B S 3/4X45	32107	395	0.00	2025-10-24 00:47:12.938475	2025-10-24 00:47:12.938475	\N	\N	\N	simple	t	f	visible	\N	
751	bbdff5b4-aa9c-4f65-af5f-6168153abec3	TEE TBA C-A/B S 1/2	32109	27	0.00	2025-10-24 00:47:12.95277	2025-10-24 00:47:12.95277	\N	\N	\N	simple	t	f	visible	\N	
752	c6856824-3cc6-45af-b7be-023418b7215e	TEE TBA C-A/B S 3/4	32110	651	0.00	2025-10-24 00:47:12.969504	2025-10-24 00:47:12.969504	\N	\N	\N	simple	t	f	visible	\N	
753	e090997d-961a-46b7-86ad-abe6007d6c99	UNION TBA C-A/B S 1/2	32112	944	0.00	2025-10-24 00:47:12.98406	2025-10-24 00:47:12.98406	\N	\N	\N	simple	t	f	visible	\N	
754	8f1cddf0-62e6-4256-a758-98fb08f6e165	UNION TBA C-A/B S 3/4	32113	120	0.00	2025-10-24 00:47:12.999097	2025-10-24 00:47:12.999097	\N	\N	\N	simple	t	f	visible	\N	
755	a92147eb-b92c-46b4-ae55-59890fdab230	ADAPT TBA C-A/B MACH R 1/2	32115	10	0.00	2025-10-24 00:47:13.015312	2025-10-24 00:47:13.015312	\N	\N	\N	simple	t	f	visible	\N	
756	309f08c1-89bc-44d5-8e4a-3e2ba74595a1	ADAPT TBA C-A/B MACH R  3/4	32116	236	0.00	2025-10-24 00:47:13.032158	2025-10-24 00:47:13.032158	\N	\N	\N	simple	t	f	visible	\N	
757	b816e050-5e7e-479e-a282-63d202a3fefd	ADAPT TBA C-A/B HEMB R 1/2	32118	0	0.00	2025-10-24 00:47:13.047712	2025-10-24 00:47:13.047712	\N	\N	\N	simple	t	f	visible	\N	
758	79a339a0-6586-4de1-84bc-181e94761222	ADAPT TBA C-A/B HEMB R 3/4	32119	318	0.00	2025-10-24 00:47:13.061547	2025-10-24 00:47:13.061547	\N	\N	\N	simple	t	f	visible	\N	
759	82c551ae-5921-4b01-8f8b-add14206b775	REDUCC TBA C-A/B S 3/4X1/2	32121	141	0.00	2025-10-24 00:47:13.073944	2025-10-24 00:47:13.073944	\N	\N	\N	simple	t	f	visible	\N	
760	eaf87dc3-c187-41fd-920e-36b63e208702	TAPON TBA C-A/B S 3/4	32124	434	0.00	2025-10-24 00:47:13.086064	2025-10-24 00:47:13.086064	\N	\N	\N	simple	t	f	visible	\N	
761	6f1ac4d1-f364-4009-a342-e5aab31a92b0	TAPON TBA C-A/B S 1/2	32123	2	0.00	2025-10-24 00:47:13.116462	2025-10-24 00:47:13.116462	\N	\N	\N	simple	t	f	visible	\N	
762	8840b700-6b73-4bc5-9422-f2cd684f1acf	CODO TBA A/N 050MMX45 C/E	32132	19	0.00	2025-10-24 00:47:13.131773	2025-10-24 00:47:13.131773	\N	\N	\N	simple	t	f	visible	\N	
763	d99f6d78-2a67-48bf-978e-c315ea2a4097	TEE TBA A/N 075MM ECC	32139	17	3.00	2025-10-24 00:47:13.14746	2025-10-24 00:47:13.14746	\N	\N	\N	simple	t	f	visible	\N	
764	abf2d29a-8f53-4fd5-b319-69e0dc45fd09	TEE TBA A/N 110MM ECC	32140	1	6.00	2025-10-24 00:47:13.160695	2025-10-24 00:47:13.160695	\N	\N	\N	simple	t	f	visible	\N	
765	5c0ecf40-f261-4a46-9762-5e5f012ce50f	TEE TBA A/N RED 110MMX050MM ECC	32145	953	4.00	2025-10-24 00:47:13.173513	2025-10-24 00:47:13.173513	\N	\N	\N	simple	t	f	visible	\N	
766	ee54ffd4-0a30-4f78-8a40-cbe06cb15b64	TEE TBA A/N RED 110MMX075MM ECC	32146	99	5.00	2025-10-24 00:47:13.186732	2025-10-24 00:47:13.186732	\N	\N	\N	simple	t	f	visible	\N	
767	6c43a696-1a1f-4f51-9d30-0060b6ad2842	YEE TBA A/N 050MM ECC	32148	1	1.00	2025-10-24 00:47:13.199162	2025-10-24 00:47:13.199162	\N	\N	\N	simple	t	f	visible	\N	
768	e1b7e3a0-ca79-4a5e-bd61-83978545d260	YEE TBA A/N 075MM ECC	32149	21	4.00	2025-10-24 00:47:13.211604	2025-10-24 00:47:13.211604	\N	\N	\N	simple	t	f	visible	\N	
769	8dbe9575-1224-463d-af67-6f80b4938910	YEE TBA A/N 110MM ECC	32150	1	8.00	2025-10-24 00:47:13.224368	2025-10-24 00:47:13.224368	\N	\N	\N	simple	t	f	visible	\N	
770	3b24d654-1357-4052-9e46-18caf621134b	YEE TBA A/N RED 75MMX50MM ECC	32154	8	3.00	2025-10-24 00:47:13.23749	2025-10-24 00:47:13.23749	\N	\N	\N	simple	t	f	visible	\N	
771	81339de8-8e55-4cc7-8c0f-4cd9cb05cffb	YEE TBA A/N RED 110MMX50MM ECC	32155	114	5.00	2025-10-24 00:47:13.250738	2025-10-24 00:47:13.250738	\N	\N	\N	simple	t	f	visible	\N	
772	08053736-24ce-4d50-a1cc-337f5a04f190	UNION TBA A/N 110MM	32160	29	2.00	2025-10-24 00:47:13.26426	2025-10-24 00:47:13.26426	\N	\N	\N	simple	t	f	visible	\N	
773	0aefe7ae-c520-4cb6-9ca8-4ce98b4054ff	REDUC TBA A/N 075MMX050MM CE	32163	1	1.00	2025-10-24 00:47:13.277374	2025-10-24 00:47:13.277374	\N	\N	\N	simple	t	f	visible	\N	
774	387718d8-0b49-49ac-b504-871862cc862e	REDUC TBA A/N 110MMX050MM CE	32164	26	2.00	2025-10-24 00:47:13.291726	2025-10-24 00:47:13.291726	\N	\N	\N	simple	t	f	visible	\N	
775	2fb51ff6-1be7-462c-91c0-14cda1d90822	REDUC TBA A/N110MMX075MM CE	32165	2	2.00	2025-10-24 00:47:13.306637	2025-10-24 00:47:13.306637	\N	\N	\N	simple	t	f	visible	\N	
776	4749aeb6-bd44-4a39-a390-e181222a9803	CURVA TBA ELECT 1/2X090 CE	32180	1	0.00	2025-10-24 00:47:13.319733	2025-10-24 00:47:13.319733	\N	\N	\N	simple	t	f	visible	\N	
777	981be334-9c0a-43f7-b2b7-a778b640feea	CURVA TBA ELECT 3/4X090 CE	32181	1	0.00	2025-10-24 00:47:13.332123	2025-10-24 00:47:13.332123	\N	\N	\N	simple	t	f	visible	\N	
778	a1a1f82c-b326-4e1f-a80c-1aa512cc0169	CURVA TBA ELECT 1X090 CE	32182	280	1.00	2025-10-24 00:47:13.344311	2025-10-24 00:47:13.344311	\N	\N	\N	simple	t	f	visible	\N	
779	83a12497-501b-4b78-a9fb-9997e97adc7f	CURVA TBA ELECT 1-1/2X090 CE	32183	2	2.00	2025-10-24 00:47:13.356528	2025-10-24 00:47:13.356528	\N	\N	\N	simple	t	f	visible	\N	
780	65571035-8d6a-4bd0-89c2-e304acce7365	CURVA TBA ELECT 2X090 CE	32184	1	4.00	2025-10-24 00:47:13.368667	2025-10-24 00:47:13.368667	\N	\N	\N	simple	t	f	visible	\N	
781	22e11340-1228-4386-95dd-d23f5782673a	CURVA TBA ELECT 3X090 CE	32185	0	9.00	2025-10-24 00:47:13.381205	2025-10-24 00:47:13.381205	\N	\N	\N	simple	t	f	visible	\N	
782	559c4309-29e9-4379-95dd-24cb468d5c62	UNION TBA ELECT 1/2	32186	1884	0.00	2025-10-24 00:47:13.393276	2025-10-24 00:47:13.393276	\N	\N	\N	simple	t	f	visible	\N	
783	3ea70d5f-2f46-4f75-bc0d-787cfc35fdc7	UNION TBA ELECT 3/4	32187	347	0.00	2025-10-24 00:47:13.405715	2025-10-24 00:47:13.405715	\N	\N	\N	simple	t	f	visible	\N	
784	07a39399-1f72-4d47-9873-daef4b26b3cb	UNION TBA ELECT 1"	32188	250	0.00	2025-10-24 00:47:13.417854	2025-10-24 00:47:13.417854	\N	\N	\N	simple	t	f	visible	\N	
785	3685d73c-b661-40d1-877c-d67e38ccbcf7	UNION TBA ELECT 2"	32190	3	1.00	2025-10-24 00:47:13.431229	2025-10-24 00:47:13.431229	\N	\N	\N	simple	t	f	visible	\N	
786	85a055e5-7799-4df9-b4fa-991947b207b7	TERMINAL TBA ELECT 1-1/2   C/TUERCA	32194	65	0.00	2025-10-24 00:47:13.444043	2025-10-24 00:47:13.444043	\N	\N	\N	simple	t	f	visible	\N	
787	0f0f6687-7a5d-4b06-9911-87b958de6212	TERMINAL TBA ELECT 2"   C/TUERCA	32195	16	1.00	2025-10-24 00:47:13.458665	2025-10-24 00:47:13.458665	\N	\N	\N	simple	t	f	visible	\N	
788	4078c5ae-0367-4a66-8eb3-28d76af07158	CAJETIN PLAST 4X1/2X3/4 OCTOGONAL TUBRICA	32201	24	1.00	2025-10-24 00:47:13.472822	2025-10-24 00:47:13.472822	\N	\N	\N	simple	t	f	visible	\N	
789	941525c6-124c-4015-a5b2-5297d3a5074c	TAPA CIEGA TBA ELECT 4X4 107X107	32205	118	1.00	2025-10-24 00:47:13.489641	2025-10-24 00:47:13.489641	\N	\N	\N	simple	t	f	visible	\N	
790	55068830-a13e-4899-8fd0-0adb591a8382	ADAPT PVC AB HEMBR S/R 3/4 ADA-24	32877	509	0.00	2025-10-24 00:47:13.50328	2025-10-24 00:47:13.50328	\N	\N	\N	simple	t	f	visible	\N	
791	89108d0e-d0d3-4d58-8bee-24570eff3dbc	CODO UNIT AN 75X90 C/C	32950	855	2.00	2025-10-24 00:47:13.516671	2025-10-24 00:47:13.516671	\N	\N	\N	simple	t	f	visible	\N	
792	cc62c7a3-c056-4ae5-91a5-7abd0e355f12	NIPLE PVC A/B  3/4X7	33698	37	1.00	2025-10-24 00:47:13.529844	2025-10-24 00:47:13.529844	\N	\N	\N	simple	t	f	visible	\N	
793	e95fefae-5558-4c69-85fc-7696c12ef4f8	NIPLE PVC A/B  3/4X8	33699	8	1.00	2025-10-24 00:47:13.562053	2025-10-24 00:47:13.562053	\N	\N	\N	simple	t	f	visible	\N	
794	ea2aa834-1eda-4eb6-bf9a-62fef5096618	NIPLE PVC A/B  3/4X10 (25 CM)	33700	58	1.00	2025-10-24 00:47:13.575923	2025-10-24 00:47:13.575923	\N	\N	\N	simple	t	f	visible	\N	
795	5d32c1e2-ffdf-4361-b5c6-1c333f11b026	SPUD DE 3/4 PLASTICO CON-51	33968	27	0.00	2025-10-24 00:47:13.589341	2025-10-24 00:47:13.589341	\N	\N	\N	simple	t	f	visible	\N	
796	3cbd0825-19a8-48a8-8fcb-b27fbd6c6572	BUSHING PVC 1X 1/2 A/B ROSC CPP-AB14 SEMILIC	34491	185	0.00	2025-10-24 00:47:13.603552	2025-10-24 00:47:13.603552	\N	\N	\N	simple	t	f	visible	\N	
797	4c868451-9177-4571-8623-5f84f3bb5881	VALVULA UNIT BOLA  C-PVC 1/2"	34605	20	1.00	2025-10-24 00:47:13.61691	2025-10-24 00:47:13.61691	\N	\N	\N	simple	t	f	visible	\N	
798	630519cc-2655-4960-9054-77632a5f3d48	VALVULA UNIT BOLA  C-PVC 3/4"	34609	34	2.00	2025-10-24 00:47:13.630183	2025-10-24 00:47:13.630183	\N	\N	\N	simple	t	f	visible	\N	
799	41a68973-580d-4327-9c91-baaf7eca8103	VALVULA UNIT BOLA  C-PVC 1"	34610	42	4.00	2025-10-24 00:47:13.643282	2025-10-24 00:47:13.643282	\N	\N	\N	simple	t	f	visible	\N	
800	54203dbf-9a5b-43e9-b74a-17ff91bb754e	ADAPT UNIT AB HEMBR 1 1/2	34612	227	1.00	2025-10-24 00:47:13.656721	2025-10-24 00:47:13.656721	\N	\N	\N	simple	t	f	visible	\N	
801	f0a109b3-e766-4670-acc2-4da4035561fe	ADAPT PCO A/B MACH S/R 2-1/2	34613	15	4.00	2025-10-24 00:47:13.669701	2025-10-24 00:47:13.669701	\N	\N	\N	simple	t	f	visible	\N	
802	f7a29639-a915-471a-897c-2294bce8ae8e	TAPON UNIT AB S 2	34614	158	0.00	2025-10-24 00:47:13.684373	2025-10-24 00:47:13.684373	\N	\N	\N	simple	t	f	visible	\N	
803	63f8c047-037d-465d-8461-313fc4d8b0b3	UNION UNIV PVC 1/2 A/B ROSC CPP-AB19 SEMILIC	34843	114	0.00	2025-10-24 00:47:13.699053	2025-10-24 00:47:13.699053	\N	\N	\N	simple	t	f	visible	\N	
804	077bbf27-30a5-4125-a127-b58680929b3d	TEE PCO A/N 04	21218	5	7.00	2025-10-24 00:47:13.713366	2025-10-24 00:47:13.713366	\N	\N	\N	simple	t	f	visible	\N	
805	b2f9ebd6-bf4e-436e-90b0-5f43e063f51a	TEE PCO A/N RED 04X02	21219	17	5.00	2025-10-24 00:47:13.72697	2025-10-24 00:47:13.72697	\N	\N	\N	simple	t	f	visible	\N	
806	89601dd8-f87a-4125-9d1e-b307dab3b703	TEE PCO A/N DOBLE 02	21222	11	2.00	2025-10-24 00:47:13.740448	2025-10-24 00:47:13.740448	\N	\N	\N	simple	t	f	visible	\N	
807	c304861b-591c-4edf-9550-56a357f52908	CODO PCO A/N 02X045 C/C	21235	56	1.00	2025-10-24 00:47:13.753845	2025-10-24 00:47:13.753845	\N	\N	\N	simple	t	f	visible	\N	
808	cab4aa90-1e2d-49a0-805c-3ac3e92a0430	UNION PCO A/N 2	21242	2	0.00	2025-10-24 00:47:13.768313	2025-10-24 00:47:13.768313	\N	\N	\N	simple	t	f	visible	\N	
809	1a261037-74f9-4387-8711-50879e242974	PINT PLAST CANELA 1GAL DECOMAX	22634	8	7.00	2025-10-24 00:47:13.781787	2025-10-24 00:47:13.781787	\N	\N	\N	simple	t	f	visible	\N	
810	ce412b6e-5a19-4d20-8714-afbc4349406f	PINT PLAST NARANJA 1GAL DECOMAX	22668	20	7.00	2025-10-24 00:47:13.79505	2025-10-24 00:47:13.79505	\N	\N	\N	simple	t	f	visible	\N	
811	bc5e8d5a-089f-4275-9765-314daec4945d	PINT PLAST VERDE (C) 1GAL DECOMAX	23790	46	7.00	2025-10-24 00:47:13.808628	2025-10-24 00:47:13.808628	\N	\N	\N	simple	t	f	visible	\N	
812	18cdb427-d5c6-49f9-a6fe-cd8e8e309952	PINT PLAST GRIS 1GAL DECOMAX	23797	14	7.00	2025-10-24 00:47:13.823635	2025-10-24 00:47:13.823635	\N	\N	\N	simple	t	f	visible	\N	
813	60b55a57-1584-441e-9895-c90c4b3a59bf	PINT PLAST MARFIL (C) 1GAL DECOMAX	23807	5	7.00	2025-10-24 00:47:13.836505	2025-10-24 00:47:13.836505	\N	\N	\N	simple	t	f	visible	\N	
814	a983982a-d2c6-4424-958b-b065c095cc6e	PINT PLAST BLANCO (C) 1GAL DECOMAX CAUD010-1	24938	146	7.00	2025-10-24 00:47:13.849373	2025-10-24 00:47:13.849373	\N	\N	\N	simple	t	f	visible	\N	
815	60334212-3212-42fe-957e-d994d7694157	PINT PLAST AMARILLO ESPLENDOR (C) 1GAL DECOMAX	25002	89	7.00	2025-10-24 00:47:13.862635	2025-10-24 00:47:13.862635	\N	\N	\N	simple	t	f	visible	\N	
816	51bc3d0e-a1e1-47ef-a2a0-830b021af82e	PINT PLAST WENGUE (C) 1GAL DECOMAX	25491	7	7.00	2025-10-24 00:47:13.875928	2025-10-24 00:47:13.875928	\N	\N	\N	simple	t	f	visible	\N	
817	cb763df5-9304-4286-955f-a358e363506b	PINT PLAST AMARILLO INTENSO (C) 1GAL DECOMAX	28442	38	7.00	2025-10-24 00:47:13.890455	2025-10-24 00:47:13.890455	\N	\N	\N	simple	t	f	visible	\N	
818	1e29f25e-ddd6-4e9b-9c0c-c05644542f58	PINT PLAST BLANCO (C) 4GAL DECOMAX	29785	36	29.00	2025-10-24 00:47:13.905341	2025-10-24 00:47:13.905341	\N	\N	\N	simple	t	f	visible	\N	
819	8782d621-7973-48d7-a7c4-bf6edff3eb53	PINT PLAST VIOLETA (C) 1GAL DECOMAX	29787	46	7.00	2025-10-24 00:47:13.919407	2025-10-24 00:47:13.919407	\N	\N	\N	simple	t	f	visible	\N	
820	5ed1843b-2c6c-4959-a4ea-fc643e000b1c	PINT PLAST VERDE PRADO (C) 1GAL DECOMAX	29823	18	7.00	2025-10-24 00:47:13.934365	2025-10-24 00:47:13.934365	\N	\N	\N	simple	t	f	visible	\N	
821	e00651dd-30ca-4585-9202-0feb8006f326	PINT PLAST AZUL PACIFICO (C) 1GAL DECOMAX	29986	19	7.00	2025-10-24 00:47:13.947977	2025-10-24 00:47:13.947977	\N	\N	\N	simple	t	f	visible	\N	
822	b5679d7a-e5de-4b6a-bed0-319b04c93231	PINT PLAST AZUL COSTANERO (C) 1GAL DECOMAX	29989	33	7.00	2025-10-24 00:47:13.963038	2025-10-24 00:47:13.963038	\N	\N	\N	simple	t	f	visible	\N	
823	3b3f54d5-9a64-4be6-b80e-7c4be3069b3d	PINT PLAST TURQUESA (C) 1GAL DECOMAX	30545	10	7.00	2025-10-24 00:47:13.977991	2025-10-24 00:47:13.977991	\N	\N	\N	simple	t	f	visible	\N	
824	e9f6b828-6038-4018-986c-09cff7a1adb3	PINT PLAST NEGRO (C) 1GAL DECOMAX	30569	0	7.00	2025-10-24 00:47:13.992297	2025-10-24 00:47:13.992297	\N	\N	\N	simple	t	f	visible	\N	
825	283ec44d-4043-4f9d-9147-4b6ff3709030	PINT PLAST MARFIL CALIDO (C) 1GAL DECOMAX	31273	96	7.00	2025-10-24 00:47:14.026533	2025-10-24 00:47:14.026533	\N	\N	\N	simple	t	f	visible	\N	
826	0c4c5edb-2e6b-4266-9c66-0c4a607ab8cd	PINT PLAST AZUL (C) 1GAL DECOMAX	32554	19	7.00	2025-10-24 00:47:14.041116	2025-10-24 00:47:14.041116	\N	\N	\N	simple	t	f	visible	\N	
827	99edea30-3a8b-4a69-8f13-a8fb18e67d1d	PINT PLAST VINOTINTO (C) 1GAL DECOMAX	34462	23	7.00	2025-10-24 00:47:14.055644	2025-10-24 00:47:14.055644	\N	\N	\N	simple	t	f	visible	\N	
828	18445773-cd60-4eb4-9c73-bc721b972e07	PINT PLAST ROJO TEJA (C) 1GAL DECOMAX	33646	7	7.00	2025-10-24 00:47:14.070054	2025-10-24 00:47:14.070054	\N	\N	\N	simple	t	f	visible	\N	
829	6fca6fd4-93a9-4f54-8878-663ff198cc4f	PINT PLAST AZUL 1GAL D-KOR (B)	20814	4	17.00	2025-10-24 00:47:14.084388	2025-10-24 00:47:14.084388	\N	\N	\N	simple	t	f	visible	\N	
830	df8da7cf-4484-43f3-8054-1a02fa8af15a	PINT PLAST ROJO CEREZA 1GAL D-KOR	26105	6	17.00	2025-10-24 00:47:14.098606	2025-10-24 00:47:14.098606	\N	\N	\N	simple	t	f	visible	\N	
831	c2012f00-ee3e-4a90-b4af-a2e8c71ea61d	PASTA PROF 1GAL D-KOR	28400	6	14.00	2025-10-24 00:47:14.111698	2025-10-24 00:47:14.111698	\N	\N	\N	simple	t	f	visible	\N	
832	30aeddfe-3725-4f89-84b3-3fcb9b50c801	PINT PLAST BLANCO OSTRA GAL D-KOR (B)	30520	0	17.00	2025-10-24 00:47:14.124724	2025-10-24 00:47:14.124724	\N	\N	\N	simple	t	f	visible	\N	
833	3916408d-6439-457e-a3e1-f16513aefac7	PINT PLAST SATINADO AZUL INTENSO 1GAL D-KOR (B)	30317	4	19.00	2025-10-24 00:47:14.137823	2025-10-24 00:47:14.137823	\N	\N	\N	simple	t	f	visible	\N	
834	4392c205-ce18-44cf-9d72-0ee4d56c1e3c	PINT PLAST SATINADO BLANCO PERLA 1GAL D-KOR (B)	30364	17	25.00	2025-10-24 00:47:14.151263	2025-10-24 00:47:14.151263	\N	\N	\N	simple	t	f	visible	\N	
835	aa5e2b96-a339-4b4c-955d-fb90afd51df1	PINT PLAST NARANJA GAL D-KOR (B)	30525	0	17.00	2025-10-24 00:47:14.165472	2025-10-24 00:47:14.165472	\N	\N	\N	simple	t	f	visible	\N	
836	0e0fe24d-eaab-4848-bd38-dc4ce0ceb5b5	PINT PLAST ROSA BOREAL GAL D-KOR (B)	30537	1	17.00	2025-10-24 00:47:14.17918	2025-10-24 00:47:14.17918	\N	\N	\N	simple	t	f	visible	\N	
837	25179f9b-d895-4a81-93d8-a2abab309e8a	PASTA PROF 1/4 GAL D-KOR	30551	8	5.00	2025-10-24 00:47:14.193391	2025-10-24 00:47:14.193391	\N	\N	\N	simple	t	f	visible	\N	
838	84b718bd-4e4d-4578-8b48-cf74c8a06c3e	PINT PLAST VERDE 1GAL D-KOR (B)	20757	0	17.00	2025-10-24 00:47:14.208253	2025-10-24 00:47:14.208253	\N	\N	\N	simple	t	f	visible	\N	
839	a9929286-c7f9-4153-b61f-9fa423c14f21	PINT PLAST AMARILLO DUNA 1GAL D-KOR (B)	20760	28	17.00	2025-10-24 00:47:14.21451	2025-10-24 00:47:14.21451	\N	\N	\N	simple	t	f	visible	\N	
840	155c15e0-70e7-4542-ae8a-f847f8f639b7	PASTA PROF 4GAL D-KOR  PASPRO0010-04	30553	0	48.00	2025-10-24 00:47:14.22836	2025-10-24 00:47:14.22836	\N	\N	\N	simple	t	f	visible	\N	
841	879d891e-098b-48dc-ae5c-0f8e68c0b8a4	PINT PLAST TURQUESA MOCHIMA 1GAL D-KOR (B)	29755	1	17.00	2025-10-24 00:47:14.24147	2025-10-24 00:47:14.24147	\N	\N	\N	simple	t	f	visible	\N	
842	877f3447-9925-42d8-bf50-5f2434b981c9	PINT PLAST BLANCO 4GAL D-KOR (B)	30558	0	62.00	2025-10-24 00:47:14.254206	2025-10-24 00:47:14.254206	\N	\N	\N	simple	t	f	visible	\N	
843	9e41c5a7-aec2-4674-8eac-a0a08ed9568f	PINT PLAST GRIS GAL D-KOR (B) CAUC130-1	30566	5	17.00	2025-10-24 00:47:14.26798	2025-10-24 00:47:14.26798	\N	\N	\N	simple	t	f	visible	\N	
844	25e78bfd-4367-4845-8559-9f56dfb84636	PINT PLAST NEGRO GAL D-KOR (B)	30568	9	17.00	2025-10-24 00:47:14.281506	2025-10-24 00:47:14.281506	\N	\N	\N	simple	t	f	visible	\N	
845	a4608e1a-1c6d-4548-9bdd-437dcf1268f3	PINT PLAST SATINADO BLANCO 1GAL D-KOR (B)	30572	12	27.00	2025-10-24 00:47:14.294756	2025-10-24 00:47:14.294756	\N	\N	\N	simple	t	f	visible	\N	
846	055ec1e2-156d-4e06-a8e4-6cee6caab6ba	PINT PLAST GRIS CLARO 1GAL D-KOR (B)	30573	2	17.00	2025-10-24 00:47:14.309342	2025-10-24 00:47:14.309342	\N	\N	\N	simple	t	f	visible	\N	
847	4802e533-a496-4129-80ea-182839bfb55b	PINT PLAST BLANCO GAL D-KOR (B)	30580	0	17.00	2025-10-24 00:47:14.323868	2025-10-24 00:47:14.323868	\N	\N	\N	simple	t	f	visible	\N	
848	ffb4ba85-f5f6-46db-a316-3d8cd4670bef	PINT PLAST SATINADO MELOCOTON 1GAL D-KOR (B)	30802	1	27.00	2025-10-24 00:47:14.338054	2025-10-24 00:47:14.338054	\N	\N	\N	simple	t	f	visible	\N	
849	6b0befd7-a3d3-4e58-a576-4cb28e32f8f7	PINT PLAST AMARILLO ESPLENDOR 1GAL D-KOR (B)	30944	5	17.00	2025-10-24 00:47:14.351045	2025-10-24 00:47:14.351045	\N	\N	\N	simple	t	f	visible	\N	
850	2c3de7fa-1f60-4976-9937-36cf6c633005	PINT PLAST MARFIL AFRICA GAL D-KOR (B)   (MATE)	31167	9	17.00	2025-10-24 00:47:14.365638	2025-10-24 00:47:14.365638	\N	\N	\N	simple	t	f	visible	\N	
851	c4c06c30-4aac-4617-b701-eebb9f3ed859	PINT PLAST SATINADO MARFIL AFRICA GAL D-KOR  (B)	31180	7	27.00	2025-10-24 00:47:14.378946	2025-10-24 00:47:14.378946	\N	\N	\N	simple	t	f	visible	\N	
852	12666513-2b7f-4312-a576-b2be46cb567b	PINT PLAST VERDE MANZANA GAL D-KOR (B)	35031	0	17.00	2025-10-24 00:47:14.392838	2025-10-24 00:47:14.392838	\N	\N	\N	simple	t	f	visible	\N	
853	cda4860c-d40a-4a50-a0de-15a04032e653	SELLADOR ANTIALCALINO CUÑ 4GAL QUIMICOLOR	20740	21	55.00	2025-10-24 00:47:14.400599	2025-10-24 00:47:14.400599	\N	\N	\N	simple	t	f	visible	\N	
854	630ddd45-4f5b-4112-b398-e003613d3e5a	SELLADOR ANTIALCALINO 1GAL QUIMICOLOR	20821	0	15.00	2025-10-24 00:47:14.41352	2025-10-24 00:47:14.41352	\N	\N	\N	simple	t	f	visible	\N	
855	83d5413c-b418-47a7-8fad-3c9fdbc4d47a	PINT EPOXI GRIS 1GAL C/CATALIZADOR QUIMICOLOR EPO130	20899	12	79.00	2025-10-24 00:47:14.444626	2025-10-24 00:47:14.444626	\N	\N	\N	simple	t	f	visible	\N	
856	39a0727d-6f44-4b6b-af1b-26ef200d8462	PINT ESMALTE SINTETICO AZUL MEDIO 1GAL QUIMICOLOR	23269	3	39.00	2025-10-24 00:47:14.45885	2025-10-24 00:47:14.45885	\N	\N	\N	simple	t	f	visible	\N	
857	a213962f-8cb6-4801-913f-9604f957c9cf	REMOVEDOR DE PINTURA UNIVERSAL 1GAL QUIMICOLOR	23786	8	35.00	2025-10-24 00:47:14.474543	2025-10-24 00:47:14.474543	\N	\N	\N	simple	t	f	visible	\N	
858	68f1f526-9628-4fc9-8b1a-e122ea607050	PINT EPOXI AZUL 1GAL C/CATALIZADOR QUIMICOLOR	24148	7	79.00	2025-10-24 00:47:14.488241	2025-10-24 00:47:14.488241	\N	\N	\N	simple	t	f	visible	\N	
859	5de7a265-e5b6-43d2-9f9f-a258033493ac	PINT EPOXI BLANCO 1GAL C/CATALIZADOR QUIMICOLOR	25971	11	79.00	2025-10-24 00:47:14.503225	2025-10-24 00:47:14.503225	\N	\N	\N	simple	t	f	visible	\N	
860	aa8da4ec-b83d-4719-8a33-27974cc506ba	PINT ESMALTE SINTETICO BLANCO 1GAL QUIMICOLOR	28133	8	47.00	2025-10-24 00:47:14.517797	2025-10-24 00:47:14.517797	\N	\N	\N	simple	t	f	visible	\N	
861	0fae8bb5-25f8-4477-9b1a-a567c2df0d8d	PINT ESMALTE SINTETICO AMARILLO CARTERPILLAR 1GAL QUIMICOLOR	28589	13	43.00	2025-10-24 00:47:14.531087	2025-10-24 00:47:14.531087	\N	\N	\N	simple	t	f	visible	\N	
862	d041a222-3510-4f80-91b2-820000530ec9	PINT ESMALTE SINTETICO BLANCO 1/4 GAL QUIMICOLOR	29299	3	14.00	2025-10-24 00:47:14.544924	2025-10-24 00:47:14.544924	\N	\N	\N	simple	t	f	visible	\N	
863	e81af4df-20b4-4f2b-8150-ee990fe0da20	PINT ESMALTE SINTETICO NARANJA 1GAL QUIMICOLOR	29341	5	39.00	2025-10-24 00:47:14.559055	2025-10-24 00:47:14.559055	\N	\N	\N	simple	t	f	visible	\N	
864	f25b1876-8833-4104-8d66-ac5212c77960	PINT ESMALTE SINTETICO NEGRO 1 GAL QUIMICOLOR	29993	8	38.00	2025-10-24 00:47:14.572279	2025-10-24 00:47:14.572279	\N	\N	\N	simple	t	f	visible	\N	
865	1a8560d0-b209-493e-964b-44f07abb7788	PINT ESMALTE SINTETICO NEGRO 1/4 GAL QUIMICOLOR	29995	8	11.00	2025-10-24 00:47:14.585349	2025-10-24 00:47:14.585349	\N	\N	\N	simple	t	f	visible	\N	
866	b0c3527f-a5e4-4c6d-870b-a5be212bf1c1	PINT ESMALTE SINTETICO ROJO 1GAL QUIMICOLOR	31327	9	39.00	2025-10-24 00:47:14.598964	2025-10-24 00:47:14.598964	\N	\N	\N	simple	t	f	visible	\N	
867	447793e3-c1a6-492f-b78b-456045b8bf1c	REMOVEDOR DE PINTURA UNIVERSAL 1/4GAL QUIMICOLOR	34099	23	12.00	2025-10-24 00:47:14.613017	2025-10-24 00:47:14.613017	\N	\N	\N	simple	t	f	visible	\N	
868	64dde9ac-cd6e-40b9-b73f-4053e1630fa1	PINT PLAST NEGRO (B) 1G ARADOS	20956	6	16.00	2025-10-24 00:47:14.627988	2025-10-24 00:47:14.627988	\N	\N	\N	simple	t	f	visible	\N	
869	54099ecd-92fa-4fff-88d1-83b38ec163ca	PINT PLAST MANDARINA (B) 1G ARADOS	26408	12	16.00	2025-10-24 00:47:14.641255	2025-10-24 00:47:14.641255	\N	\N	\N	simple	t	f	visible	\N	
870	4c6a63b7-09fa-432a-8773-5d6c917b8035	PINT PLAST BLANCO HUMO (B) 1GAL ARADOS	26409	15	16.00	2025-10-24 00:47:14.655665	2025-10-24 00:47:14.655665	\N	\N	\N	simple	t	f	visible	\N	
871	e41da337-cd98-48eb-b725-22a52edc2593	PINT PLAST SAHARA (B) 1G ARADOS	30300	15	16.00	2025-10-24 00:47:14.669241	2025-10-24 00:47:14.669241	\N	\N	\N	simple	t	f	visible	\N	
872	1d3fe0ec-edd3-4017-b68e-f770b6b12ad4	PINT PLAST VINO (B) 1G ARADOS CBA017	30305	16	16.00	2025-10-24 00:47:14.684	2025-10-24 00:47:14.684	\N	\N	\N	simple	t	f	visible	\N	
873	89bbd7f5-061b-4d8b-9fb2-e3c2b9f6f6c5	PINT PLAST GRIS CLARO (B) ARADOS	30322	65	16.00	2025-10-24 00:47:14.69798	2025-10-24 00:47:14.69798	\N	\N	\N	simple	t	f	visible	\N	
874	3c675875-9955-489f-bd6c-d4318580068b	PINT PLAST ROJO CEREZA (B) 1G ARADOS	30484	7	16.00	2025-10-24 00:47:14.712124	2025-10-24 00:47:14.712124	\N	\N	\N	simple	t	f	visible	\N	
875	c47987d2-39ab-4198-be2c-b1fcaf9d4ebf	PINT PLAST BEIGE (B) 1G ARADOS	30485	6	16.00	2025-10-24 00:47:14.725149	2025-10-24 00:47:14.725149	\N	\N	\N	simple	t	f	visible	\N	
876	dbfc98c0-fa0e-414b-aff3-3d3acfd948c9	PINT PLAST MOSTAZA (B) 1G ARADOS	30487	17	16.00	2025-10-24 00:47:14.737328	2025-10-24 00:47:14.737328	\N	\N	\N	simple	t	f	visible	\N	
877	2ab19052-6264-4901-96a3-77917f2f9877	PINT PLAST SALMON (B) 1G ARADOS	30532	24	16.00	2025-10-24 00:47:14.750077	2025-10-24 00:47:14.750077	\N	\N	\N	simple	t	f	visible	\N	
878	52adc656-bbb4-48ce-b3e3-34d174717897	PINT PLAST GRIS CEMENTO (B) 1G ARADOS CBA033	30543	13	16.00	2025-10-24 00:47:14.762805	2025-10-24 00:47:14.762805	\N	\N	\N	simple	t	f	visible	\N	
879	71d9f224-959d-4c64-9450-2c02de01c0ba	PINT PLAST OLIVO (B) 1G ARADOS	30805	11	16.00	2025-10-24 00:47:14.776546	2025-10-24 00:47:14.776546	\N	\N	\N	simple	t	f	visible	\N	
880	ae8c8381-6ee5-4aaa-8e49-1ba53265ab86	PINT PLAST MOSTAZA CLARO (B) 1G ARADOS	30811	26	16.00	2025-10-24 00:47:14.791393	2025-10-24 00:47:14.791393	\N	\N	\N	simple	t	f	visible	\N	
881	7c810677-c417-4e59-b453-c7802f06108c	PINT PLAST BLANCO (B) 1G ARADOS CBA001	30812	123	16.00	2025-10-24 00:47:14.804161	2025-10-24 00:47:14.804161	\N	\N	\N	simple	t	f	visible	\N	
882	4a0c1825-669c-4d04-b697-6f3bd37893ab	PINT PLAST BAHAMAS (B) 1G ARADOS	30817	12	16.00	2025-10-24 00:47:14.819137	2025-10-24 00:47:14.819137	\N	\N	\N	simple	t	f	visible	\N	
883	3c0af302-ef67-4c85-921c-774a8a801c4a	PINT PLAST MARFIL (B) 1G ARADOS	30818	6	16.00	2025-10-24 00:47:14.832009	2025-10-24 00:47:14.832009	\N	\N	\N	simple	t	f	visible	\N	
884	eabbb653-b176-4c41-ab38-8ec11ba63abf	PINT PLAST GRIS MARINO (B) 1G ARADOS	30819	7	16.00	2025-10-24 00:47:14.845515	2025-10-24 00:47:14.845515	\N	\N	\N	simple	t	f	visible	\N	
885	f01aa948-199e-4acf-9a00-1a7dcedb0813	PINT PLAST GRIS VOLCANICO (B) 1G ARADOS CBA049	30903	22	16.00	2025-10-24 00:47:14.859028	2025-10-24 00:47:14.859028	\N	\N	\N	simple	t	f	visible	\N	
886	6e3a954d-4db1-46e2-964b-1f2b4015f4dd	PINT PLAST AZUL CELESTE (B) 1G ARADOS	30909	23	16.00	2025-10-24 00:47:14.871501	2025-10-24 00:47:14.871501	\N	\N	\N	simple	t	f	visible	\N	
887	32627ef0-e621-4828-913c-d2bb974bf8e5	PINT PLAST AMARILLO (B) 1G ARADOS	30910	19	16.00	2025-10-24 00:47:14.903954	2025-10-24 00:47:14.903954	\N	\N	\N	simple	t	f	visible	\N	
888	cf18e6a7-ebe7-4593-ab73-c8265db125b1	PINT PLAST OSTRA (B) 1G ARADOS	30914	3	16.00	2025-10-24 00:47:14.918844	2025-10-24 00:47:14.918844	\N	\N	\N	simple	t	f	visible	\N	
889	b57c1549-978a-422d-8e2b-46a6e48fef21	PINT PLAST AZUL CIELO (B) 1G ARADOS	30920	22	16.00	2025-10-24 00:47:14.933843	2025-10-24 00:47:14.933843	\N	\N	\N	simple	t	f	visible	\N	
890	8c209c04-adab-4a07-b5c8-a3620e5f81ff	PINT PLAST  MANZANA (B) 1G ARADOS	30931	13	16.00	2025-10-24 00:47:14.948584	2025-10-24 00:47:14.948584	\N	\N	\N	simple	t	f	visible	\N	
891	3cab8a3f-caf6-43d6-bcb2-cdec43feab7d	PINT PLAST GRAMA (B) 1G ARADOS	30945	27	16.00	2025-10-24 00:47:14.960947	2025-10-24 00:47:14.960947	\N	\N	\N	simple	t	f	visible	\N	
892	5d7b5f22-e433-4fd4-bb97-f2b6629b269c	PINT PLAST FUSCIA (B) 1G ARADOS	30951	25	16.00	2025-10-24 00:47:14.973662	2025-10-24 00:47:14.973662	\N	\N	\N	simple	t	f	visible	\N	
893	dfe5b7c1-fc50-449f-bf64-1dbeef31b591	PINT PLAST LADRILLO (B) 1G ARADOS CBA009	30955	16	16.00	2025-10-24 00:47:14.985737	2025-10-24 00:47:14.985737	\N	\N	\N	simple	t	f	visible	\N	
894	fccab24c-51a5-4e05-b9d5-0eee1bcb6e79	PINT PLAST TURQUESA (B) 1G ARADOS	30956	32	16.00	2025-10-24 00:47:14.998349	2025-10-24 00:47:14.998349	\N	\N	\N	simple	t	f	visible	\N	
895	325e69d4-1579-4a08-986b-1822cfd84ba6	PINT PLAST NAUTICO (B) 1G ARADOS	35529	31	16.00	2025-10-24 00:47:15.013042	2025-10-24 00:47:15.013042	\N	\N	\N	simple	t	f	visible	\N	
896	7ea363b1-b525-41e0-b9b4-c30e1bef5846	PINT ESMALTE BRILLANTE NARANJA 1/4G ARADOS VERONA	30325	16	9.00	2025-10-24 00:47:15.028665	2025-10-24 00:47:15.028665	\N	\N	\N	simple	t	f	visible	\N	
897	d0955c0a-3ff2-41a4-9cc0-934471b82272	PINT PLAST AMARILLO MATE (C) 1G REINCO	30316	3	8.00	2025-10-24 00:47:15.041844	2025-10-24 00:47:15.041844	\N	\N	\N	simple	t	f	visible	\N	
898	60ed8805-8003-4538-8d0e-d58144474af8	PINT PLAST AZUL MATE (C) 1G REINCO	30339	0	11.00	2025-10-24 00:47:15.055351	2025-10-24 00:47:15.055351	\N	\N	\N	simple	t	f	visible	\N	
899	ae92ff4d-7a65-461e-a2d7-a7837e585e30	PINT PLAST NARANJA  MATE (C) 1G REINCO	30374	0	11.00	2025-10-24 00:47:15.062254	2025-10-24 00:47:15.062254	\N	\N	\N	simple	t	f	visible	\N	
900	efa32c13-56d0-46cd-8c09-760bd13d6f5d	PINT PLAST TURQUESA  MATE (C) 1G REINCO	30561	0	11.00	2025-10-24 00:47:15.068296	2025-10-24 00:47:15.068296	\N	\N	\N	simple	t	f	visible	\N	
901	eefe4880-0db4-4fee-9c56-512c2cb27be0	PROTECTOR ARRANCADOR P/BOMBA BORN 110V 14A 746W/1HP EXCELINE GAM-B120	22611	6	53.00	2025-10-24 00:47:15.081778	2025-10-24 00:47:15.081778	\N	\N	\N	simple	t	f	visible	\N	
902	76f1fecd-8486-4799-9f3f-79ff93637da5	PROTECTOR AIRE Y REF 220V EXCELINE GSM-R220B/3	22809	0	22.00	2025-10-24 00:47:15.104613	2025-10-24 00:47:15.104613	\N	\N	\N	simple	t	f	visible	\N	
903	e14087e1-cd60-4161-a417-b83674f75a0a	PROTECTOR P/NEVERA-REFRIG DIGIT 110V PTV002 BLCO	23254	13	12.00	2025-10-24 00:47:15.126437	2025-10-24 00:47:15.126437	\N	\N	\N	simple	t	f	visible	\N	
904	7a10af02-364c-47c9-8d4d-20bb8452bf9f	PROTECTOR EQUIP ELECT 110V 3T PTV005	23280	6	14.00	2025-10-24 00:47:15.147083	2025-10-24 00:47:15.147083	\N	\N	\N	simple	t	f	visible	\N	
905	3f00b1b6-e139-435f-963f-4f5d0e0d780d	PROTECTOR P/NEVERA-REFRIG 110V PTV001 NEGRO	23296	11	11.00	2025-10-24 00:47:15.168529	2025-10-24 00:47:15.168529	\N	\N	\N	simple	t	f	visible	\N	
906	942e2b00-e3d1-4bfa-a4ae-6ca621ccd751	PROTECTOR EQUIP/ELECT 120V GSM-EP120	24281	1	30.00	2025-10-24 00:47:15.188171	2025-10-24 00:47:15.188171	\N	\N	\N	simple	t	f	visible	\N	
907	f705ae07-d5ab-4d7e-8499-470be64014bf	PROTECTOR CONEXION A INTERNET 120V GSM-LPM120	24365	6	12.00	2025-10-24 00:47:15.207765	2025-10-24 00:47:15.207765	\N	\N	\N	simple	t	f	visible	\N	
908	f4de0e26-9253-4ae1-9239-f3ce9536d706	PROTECTOR AIR-ACO/REF T/CHINA (P/GALLINA) 220V GSM-RE220CS	24609	6	24.00	2025-10-24 00:47:15.228191	2025-10-24 00:47:15.228191	\N	\N	\N	simple	t	f	visible	\N	
909	ab34f2d4-ee77-41dd-b932-f02879e5bf87	PROTECTOR SUPERVIS TRIF 220V GST-RR220 EXCELINE	25605	4	27.00	2025-10-24 00:47:15.268988	2025-10-24 00:47:15.268988	\N	\N	\N	simple	t	f	visible	\N	
910	27a80e8f-5b66-43f2-aaa0-d0ab3e5e642f	PROTECTOR NEVERAS 120V GSM-NP120	26598	6	33.00	2025-10-24 00:47:15.294194	2025-10-24 00:47:15.294194	\N	\N	\N	simple	t	f	visible	\N	
911	50084c03-e7ea-40d3-bb60-2ce9b123adbb	TIRRO EMBALAR 2 MARRON 50MTS TIR-07	26611	28	2.00	2025-10-24 00:47:15.327783	2025-10-24 00:47:15.327783	\N	\N	\N	simple	t	f	visible	\N	
912	ea9afeb3-8b6d-4ae7-b66a-c0bd6ef1f2b2	PROTECTOR P/COMPRESOR 220V GSM-RF220B/3 EXCELINE	28008	12	17.00	2025-10-24 00:47:15.334643	2025-10-24 00:47:15.334643	\N	\N	\N	simple	t	f	visible	\N	
913	4999319b-4f87-4a47-b68e-960470f46498	PROTECTOR ELECTRODOMESTICO EXCELINE GSMMP120 120V	28469	6	16.00	2025-10-24 00:47:15.360566	2025-10-24 00:47:15.360566	\N	\N	\N	simple	t	f	visible	\N	
914	2172518a-dd55-442b-8506-4c438c4bb3d7	PROTECTOR AIR-ACON 110V GSM-RE120A/3 EXCELINE	28470	16	24.00	2025-10-24 00:47:15.381979	2025-10-24 00:47:15.381979	\N	\N	\N	simple	t	f	visible	\N	
915	88d5c71c-0e5d-429b-8015-25e3b50b49a2	PROTECTOR AIR-AC/REFRIG ENCHUF CHINO 220V GSM-RE220M/3 EXCELINE	28471	28	21.00	2025-10-24 00:47:15.403026	2025-10-24 00:47:15.403026	\N	\N	\N	simple	t	f	visible	\N	
961	fbf188a8-cc4d-4d17-a792-8dbb31a5ad94	LLAVE DUCHA IND 1/2 LF 9A1 04-012-020	26069	7	5.00	2025-10-24 00:47:16.32037	2025-10-24 00:47:16.32037	\N	\N	\N	simple	t	f	visible	\N	
916	be1c5da0-1ec7-430c-9574-587a2697ddc0	PROTECTOR SUPERV MONOF BOMBA/MOTOR/COMPRES 220V GSM-L220 EXCELINE	28473	3	23.00	2025-10-24 00:47:15.425324	2025-10-24 00:47:15.425324	\N	\N	\N	simple	t	f	visible	\N	
917	154c0a24-a907-4a9f-8f38-bf4dc9915ad4	PROTECTOR NEVERAS / REFRIG 120V GSM-N120	28475	19	11.00	2025-10-24 00:47:15.44169	2025-10-24 00:47:15.44169	\N	\N	\N	simple	t	f	visible	\N	
918	99134b83-e283-4fc4-8023-d19be70ab9a0	PROTECTOR P/TELEVISORES 120V GSM-TV 120	29155	5	23.00	2025-10-24 00:47:15.463559	2025-10-24 00:47:15.463559	\N	\N	\N	simple	t	f	visible	\N	
919	300c778a-8ed3-4a3c-b62e-682355e31b62	PROTECTOR AIR-ACON 110V GSM-R120B/3 EXCELINE	31334	3	20.00	2025-10-24 00:47:15.487479	2025-10-24 00:47:15.487479	\N	\N	\N	simple	t	f	visible	\N	
920	5d51698e-baf2-4274-8713-83817c34b13b	PROTECTOR MOTOR 120V GSM-M120B EXCELINE	31698	2	30.00	2025-10-24 00:47:15.51165	2025-10-24 00:47:15.51165	\N	\N	\N	simple	t	f	visible	\N	
921	0b3790ac-80bd-471d-ad0c-ee256b9c89f9	PROTECTOR HORNO MICROONDA 120V GSM-MW120	32600	4	14.00	2025-10-24 00:47:15.53484	2025-10-24 00:47:15.53484	\N	\N	\N	simple	t	f	visible	\N	
922	a7237ef8-b34e-4c76-8000-397bcf44c742	PROTECTOR AIR/ACON MONOF 120V GSM-RF120B	33188	10	18.00	2025-10-24 00:47:15.559278	2025-10-24 00:47:15.559278	\N	\N	\N	simple	t	f	visible	\N	
923	aa778c8c-d884-470f-838e-d42b1190d8b7	PROTECTOR P/TELEVISORES 120V PTV006	34730	3	16.00	2025-10-24 00:47:15.601855	2025-10-24 00:47:15.601855	\N	\N	\N	simple	t	f	visible	\N	
924	31c8cc1b-aded-4a9a-9af7-b0166672ba33	PROTECTOR AIRE/ACOND Y REFRIG 220V T/CHINA LUMISTAR PTV008	34735	26	15.00	2025-10-24 00:47:15.623314	2025-10-24 00:47:15.623314	\N	\N	\N	simple	t	f	visible	\N	
925	863ef7a5-6ef2-4637-9f3b-a2c3668a8a3b	PROTECTOR EQUIP TRIF 220V BORNE PTV009	34736	16	15.00	2025-10-24 00:47:15.645276	2025-10-24 00:47:15.645276	\N	\N	\N	simple	t	f	visible	\N	
926	40c5b13c-ee2f-4706-89d1-d481c58c9f24	TAPA ASIENTO BLANCO CONFORTO CORONA	22292	19	21.00	2025-10-24 00:47:15.667667	2025-10-24 00:47:15.667667	\N	\N	\N	simple	t	f	visible	\N	
927	9344e9ce-464a-4c24-ab5d-1b33af802d66	TAPA ASIENTO BONE ELONG MONTECRISTO	22294	7	23.00	2025-10-24 00:47:15.687194	2025-10-24 00:47:15.687194	\N	\N	\N	simple	t	f	visible	\N	
928	f3974a93-5393-4985-ba61-d97e158261b0	TAPA ASIENTO ROSE  MONTECRISTO	22295	0	27.00	2025-10-24 00:47:15.703499	2025-10-24 00:47:15.703499	\N	\N	\N	simple	t	f	visible	\N	
929	dc6a5d7a-b9d9-4b01-97b3-b0963fca6683	TAPA ASIENTO BLANCO GLACIAR MONTECRISTO RF VENCERAMICA	22300	27	25.00	2025-10-24 00:47:15.719683	2025-10-24 00:47:15.719683	\N	\N	\N	simple	t	f	visible	\N	
930	ceb6e7ff-7d98-4c53-b64a-8aa6dd8bfa21	TAPA ASIENTO VERDE MIST DELTA RESIMOL	22321	9	21.00	2025-10-24 00:47:15.734681	2025-10-24 00:47:15.734681	\N	\N	\N	simple	t	f	visible	\N	
931	8d8fe44c-eac1-46bc-86c1-3960e6ba4e26	TAPA ASIENTO BLANCO GAUDI EF VENCERAMICA	22909	7	33.00	2025-10-24 00:47:15.749444	2025-10-24 00:47:15.749444	\N	\N	\N	simple	t	f	visible	\N	
932	f5c40bcf-10ea-4654-899e-1f425ea3c472	TAPA ASIENTO BLANCO ELONG NEW COUNTRY VENC	33758	3	46.00	2025-10-24 00:47:15.770255	2025-10-24 00:47:15.770255	\N	\N	\N	simple	t	f	visible	\N	
933	d120c73e-6bcf-4ad5-8007-ffb5e8400cf5	TAPA ASIENTO GRIS BASICO DELTA RESIMOL	22905	6	21.00	2025-10-24 00:47:15.790113	2025-10-24 00:47:15.790113	\N	\N	\N	simple	t	f	visible	\N	
934	9d14fb7a-86d5-453a-9545-d7ce94c8eef7	TAPA ASIENTO BLANCO LX-1003SC METALES ALEADOS	24234	11	14.00	2025-10-24 00:47:15.806994	2025-10-24 00:47:15.806994	\N	\N	\N	simple	t	f	visible	\N	
935	a965f1e5-8465-4827-9433-8e2dd568863a	TAPA ASIENTO BONE MAGNOLIA PLUS VENCERAMICA	25327	0	33.00	2025-10-24 00:47:15.823549	2025-10-24 00:47:15.823549	\N	\N	\N	simple	t	f	visible	\N	
936	90218e24-d314-497c-be86-2fb3d708179d	TAPA ASIENTO BEIGE BASICO DELTA RESIMOL	26044	8	21.00	2025-10-24 00:47:15.831324	2025-10-24 00:47:15.831324	\N	\N	\N	simple	t	f	visible	\N	
937	98eeef23-eac4-4778-932e-f0abb50425a1	TAPA ASIENTO ROSADO BASICO DELTA RESIMOL	26054	2	21.00	2025-10-24 00:47:15.85002	2025-10-24 00:47:15.85002	\N	\N	\N	simple	t	f	visible	\N	
938	f13d2853-8e53-4af5-8adf-15e835754daa	TAPA ASIENTO BLANCO MAGNOLIA ADVANCE VENCERAM	26731	13	33.00	2025-10-24 00:47:15.868801	2025-10-24 00:47:15.868801	\N	\N	\N	simple	t	f	visible	\N	
939	dddde501-4228-47b7-959a-dee50434c1bb	TAPA ASIENTO AZUL CLARO DELTA RESIMOL	31528	3	21.00	2025-10-24 00:47:15.887527	2025-10-24 00:47:15.887527	\N	\N	\N	simple	t	f	visible	\N	
940	b969d763-ef6a-487d-8b3f-a6375d9a6c25	TAPA ASIENTO MARFIL DELTA RESIMOL	22385	12	21.00	2025-10-24 00:47:15.906181	2025-10-24 00:47:15.906181	\N	\N	\N	simple	t	f	visible	\N	
941	b31c1d57-b525-445a-80d8-9a7a1ef2f901	TAPA ASIENTO NEGRO DELTA RESIMOL	32902	5	21.00	2025-10-24 00:47:15.923394	2025-10-24 00:47:15.923394	\N	\N	\N	simple	t	f	visible	\N	
942	d4a44d2f-a7b9-4e94-86b3-2737f0c62e0f	HERRAJE WC C/MANILLA UNIVERSAL BRUFER 231611	22817	61	7.00	2025-10-24 00:47:15.958339	2025-10-24 00:47:15.958339	\N	\N	\N	simple	t	f	visible	\N	
943	f40d3e68-1cef-495a-bea0-1a14deabd110	HERRAJE WC C/MANILLA PLAST RIOPLAST	22955	43	18.00	2025-10-24 00:47:15.975885	2025-10-24 00:47:15.975885	\N	\N	\N	simple	t	f	visible	\N	
944	7cfd5d9a-7ebe-4b20-ad06-f05f2a7f9548	HERRAJE PLAST WC JOMAI N.2 (LARGO) HW0201	23377	49	9.00	2025-10-24 00:47:15.993172	2025-10-24 00:47:15.993172	\N	\N	\N	simple	t	f	visible	\N	
945	95e12075-cabb-4263-be53-ab9f984f0309	HERRAJE PLAST WC JOMAI No 1 (CORTO) HW0101	23378	51	9.00	2025-10-24 00:47:16.009087	2025-10-24 00:47:16.009087	\N	\N	\N	simple	t	f	visible	\N	
946	8a6afdd7-322e-4343-8f91-510d4f821035	HERRAJE PLATS WC MANILLA 04-010-014 LF PN202527	24499	45	5.00	2025-10-24 00:47:16.024497	2025-10-24 00:47:16.024497	\N	\N	\N	simple	t	f	visible	\N	
947	a1cfc522-b2b2-4631-b94f-cd89f04f240a	HERRAJE WC RIMINI VENCERAMICA	24916	11	23.00	2025-10-24 00:47:16.040552	2025-10-24 00:47:16.040552	\N	\N	\N	simple	t	f	visible	\N	
948	287b2bd0-bb03-4b5a-bc79-a313dde69232	HERRAJE PLAST WC HER01 FAGUAX/FAMA	25221	26	10.00	2025-10-24 00:47:16.056607	2025-10-24 00:47:16.056607	\N	\N	\N	simple	t	f	visible	\N	
949	89188114-736d-4730-bfa3-ee1905784848	HERRAJE PLAST WC MANILLA TAURO HER1000	26136	8	7.00	2025-10-24 00:47:16.072305	2025-10-24 00:47:16.072305	\N	\N	\N	simple	t	f	visible	\N	
950	2394ab83-15f6-4a82-84d9-d1ed1314f4cd	HERRAJE PLAST WC ROSMASTER/FAGUAX	27935	6	23.00	2025-10-24 00:47:16.090237	2025-10-24 00:47:16.090237	\N	\N	\N	simple	t	f	visible	\N	
951	e5c6bc51-beb9-4755-899f-bf373083bd97	HERRAJE PLAST WC OASIS P/BOTON VENCERAMICA	28012	17	14.00	2025-10-24 00:47:16.108969	2025-10-24 00:47:16.108969	\N	\N	\N	simple	t	f	visible	\N	
952	04469554-e8cb-4e41-834d-db26e07b939c	HERRAJE PLAST WC YDROS MANILLA VENCERAMICA	28080	25	15.00	2025-10-24 00:47:16.12679	2025-10-24 00:47:16.12679	\N	\N	\N	simple	t	f	visible	\N	
953	c9858ddf-7595-4c5e-9470-7ed2789f7afe	HERRAJE WC KINGSTONE ADVANCE P/BUTTON VENCERAMICA	30192	7	14.00	2025-10-24 00:47:16.143409	2025-10-24 00:47:16.143409	\N	\N	\N	simple	t	f	visible	\N	
954	518caa66-b53a-406b-bdc8-157eb0313e6c	HERRAJE PLAST WC MANILLA PS-A005 COFLEX	34071	5	22.00	2025-10-24 00:47:16.16049	2025-10-24 00:47:16.16049	\N	\N	\N	simple	t	f	visible	\N	
955	860e3cfb-140f-416e-b869-d1ee6dee4ed0	HERRAJE WC C/MANILLA BPK-0001M MET-ALEADOS	20101	16	16.00	2025-10-24 00:47:16.176862	2025-10-24 00:47:16.176862	\N	\N	\N	simple	t	f	visible	\N	
956	46bd035b-eb77-4965-a29e-a96345bec607	LLAVE DUCHA IND 1/2 LF 8A1 04-012-019	11046	14	5.00	2025-10-24 00:47:16.193231	2025-10-24 00:47:16.193231	\N	\N	\N	simple	t	f	visible	\N	
957	48c226c2-e07d-4e5b-bd6b-14c1a8a80299	LLAVE DUCHA IND MONOM MET-552N MET ALEADOS	21118	2	63.00	2025-10-24 00:47:16.213699	2025-10-24 00:47:16.213699	\N	\N	\N	simple	t	f	visible	\N	
958	41c1ba58-c3f4-4b9c-bf73-98a9fa92043f	LLAVE DUCHA IND P/MET LLA-02 USY	23392	8	19.00	2025-10-24 00:47:16.234065	2025-10-24 00:47:16.234065	\N	\N	\N	simple	t	f	visible	\N	
959	011b2316-ec87-46e3-8e9d-0d043b8d7565	LLAVE DUCHA IND MONOM GUN METAL PRESTIGE 32GDU0072GM FP	24272	1	122.00	2025-10-24 00:47:16.253716	2025-10-24 00:47:16.253716	\N	\N	\N	simple	t	f	visible	\N	
960	3a0496d4-e6cc-40c7-9ebd-d29faafa4211	LLAVE DUCHA IND LLOVIZNA D2024 FAGUAX	25068	34	14.00	2025-10-24 00:47:16.283406	2025-10-24 00:47:16.283406	\N	\N	\N	simple	t	f	visible	\N	
962	5bd9b8f3-1ca4-4d44-9a86-d55cbd7f350e	LLAVE DUCHA IND 1/2 LF 5A1 04-012-016	26073	16	4.00	2025-10-24 00:47:16.341565	2025-10-24 00:47:16.341565	\N	\N	\N	simple	t	f	visible	\N	
963	f8acd8c1-1a8b-451d-a0df-896ea3cc4627	LLAVE DUCHA IND 1/2 LF 6A1 04-012-017	26074	26	5.00	2025-10-24 00:47:16.362383	2025-10-24 00:47:16.362383	\N	\N	\N	simple	t	f	visible	\N	
964	b90e733d-af4d-455e-affc-17f071089eed	LLAVE DUCHA IND 1/2 LF 7A1 04-012-018	26075	17	4.00	2025-10-24 00:47:16.378895	2025-10-24 00:47:16.378895	\N	\N	\N	simple	t	f	visible	\N	
965	9e1d9597-790f-4848-b29b-0a50e0a3eadd	LLAVE DUCHA IND M/CROSS 02DU01C	26901	3	58.00	2025-10-24 00:47:16.398404	2025-10-24 00:47:16.398404	\N	\N	\N	simple	t	f	visible	\N	
966	f01384d2-9666-4274-9a58-0ec4f8b668ba	LLAVE DUCHA IND M/PLANA METALES ALEAD MET-405	34399	4	12.00	2025-10-24 00:47:16.416836	2025-10-24 00:47:16.416836	\N	\N	\N	simple	t	f	visible	\N	
967	1ccb26e7-55ac-4409-936d-6d408a80d70b	LLAVE DUCHA IND 1/2 GRIVEN A367-WA016A 9396	35855	24	18.00	2025-10-24 00:47:16.429302	2025-10-24 00:47:16.429302	\N	\N	\N	simple	t	f	visible	\N	
968	42558a0f-3982-40b0-9c4f-59b2a0f9eb4e	LLAVE DUCHA IND M/POMO FP 02DU01	27912	6	42.00	2025-10-24 00:47:16.446985	2025-10-24 00:47:16.446985	\N	\N	\N	simple	t	f	visible	\N	
969	5c6a92ba-f6c7-4b6b-872f-c071fa801398	LLAVE DUCHA INDIV GRIVEN  GV-WA-2 10051	35843	25	15.00	2025-10-24 00:47:16.46649	2025-10-24 00:47:16.46649	\N	\N	\N	simple	t	f	visible	\N	
970	da7feb43-06b1-425c-81ee-fe2cf4611f57	LLAVE DUCHA IND 1/2 GRIVEN A367-WA021 9401	35856	6	17.00	2025-10-24 00:47:16.484487	2025-10-24 00:47:16.484487	\N	\N	\N	simple	t	f	visible	\N	
971	c39dc4f0-ee91-44ef-9d3c-ccb37c55db1e	LLAVE DUCHA IND 1/2 GRIVEN A367-WA024 9400	35857	8	15.00	2025-10-24 00:47:16.501924	2025-10-24 00:47:16.501924	\N	\N	\N	simple	t	f	visible	\N	
972	f471e2c2-8ec3-4e95-b0d9-978932734aed	LAMP PANEL LED CUAD EMP 6W 100-240V VERT SPS-004	20221	12	4.00	2025-10-24 00:47:16.520271	2025-10-24 00:47:16.520271	\N	\N	\N	simple	t	f	visible	\N	
973	357f71a4-1e8d-4315-9d83-7ffe8d2fa71d	LAMP PANEL LED CUAD EMP 20W 110-277V ZQ-TKF20W BJ	20246	20	7.00	2025-10-24 00:47:16.540294	2025-10-24 00:47:16.540294	\N	\N	\N	simple	t	f	visible	\N	
974	4c074fdb-b903-49c3-92c1-a12fd18bd5dd	LAMP PANEL LED DECORATIVA BLANCA 8W L/RGB VERT LA8-8RB	20779	5	21.00	2025-10-24 00:47:16.560592	2025-10-24 00:47:16.560592	\N	\N	\N	simple	t	f	visible	\N	
975	9518e13b-14b5-4348-a54c-b71bb36c1383	LAMP PANEL LED RED EMP 18W 85-265V VERT SRR-186N	20854	3	7.00	2025-10-24 00:47:16.580731	2025-10-24 00:47:16.580731	\N	\N	\N	simple	t	f	visible	\N	
976	dd4edace-9835-4ab1-9db3-37543ea5f7c0	LAMP PANEL LED RED EMP 6W 85-240V VERT SRR-66N	20857	6	4.00	2025-10-24 00:47:16.615289	2025-10-24 00:47:16.615289	\N	\N	\N	simple	t	f	visible	\N	
977	e295f5f2-9383-44c0-8234-5f18dd4e4d75	LAMP PANEL LED CUAD EMP 9W 85-265V HAMMER FHE-14129C	21069	18	4.00	2025-10-24 00:47:16.639909	2025-10-24 00:47:16.639909	\N	\N	\N	simple	t	f	visible	\N	
978	df981f36-0c47-4554-af85-a6313c098b00	LAMP PANEL LED RED EMP 18W 85-265V HAMMER FHR-200118W	22783	5	7.00	2025-10-24 00:47:16.680365	2025-10-24 00:47:16.680365	\N	\N	\N	simple	t	f	visible	\N	
979	21fac15e-3f0a-4a32-a2e0-dd71458cf13e	LAMP PANEL LED RED EMP 26W 110-277V ZQ-TKY BJ LIGHT	23088	25	9.00	2025-10-24 00:47:16.701475	2025-10-24 00:47:16.701475	\N	\N	\N	simple	t	f	visible	\N	
980	05f4ae44-a2c0-4dc1-9ba1-4075d472b4f0	LAMP PANEL LED RED SUP 18W L/CALIDA 110-277V ZQ-TKYM-3K BJ LIGHT	23731	17	11.00	2025-10-24 00:47:16.722962	2025-10-24 00:47:16.722962	\N	\N	\N	simple	t	f	visible	\N	
981	19884ce6-b37e-4b21-8dd4-c0ca627306b9	LAMP PANEL LED RED EMP 6W 110-277V ZQ-TKY BJ LIGHT	23922	29	3.00	2025-10-24 00:47:16.741664	2025-10-24 00:47:16.741664	\N	\N	\N	simple	t	f	visible	\N	
982	ec09a8ad-98af-41cc-aae0-2d96a1306139	LAMP PANEL LED RED SUP 24W 85-265 VERT EPRS-246	24562	4	10.00	2025-10-24 00:47:16.761668	2025-10-24 00:47:16.761668	\N	\N	\N	simple	t	f	visible	\N	
983	66c65fdd-f194-4a72-87b2-8e40fb792d18	LAMP PANEL LED CUAD SUP 18W 100-240V VERT SPS-016	25726	12	11.00	2025-10-24 00:47:16.787437	2025-10-24 00:47:16.787437	\N	\N	\N	simple	t	f	visible	\N	
984	704928d1-3310-45ec-97a7-6d2e62d5b4d0	LAMP PANEL LED CUAD SUP 12W 110-220V LED74-M LUMIST	25954	21	6.00	2025-10-24 00:47:16.812431	2025-10-24 00:47:16.812431	\N	\N	\N	simple	t	f	visible	\N	
985	77ee1c61-a598-461e-9b0c-4c848fddd59d	LAMP PANEL LED RED SUP 18W 110-220V LED71 LUMISTAR	25955	1	7.00	2025-10-24 00:47:16.83926	2025-10-24 00:47:16.83926	\N	\N	\N	simple	t	f	visible	\N	
986	314374a4-1289-465d-9019-b33ea1fa3dd8	LAMP PANEL LED CUAD SUP 12W 110-277V ZQ-TKFM BJ LIGHT	26212	6	6.00	2025-10-24 00:47:16.860599	2025-10-24 00:47:16.860599	\N	\N	\N	simple	t	f	visible	\N	
987	a384a915-f60e-418f-996c-bd3370e8e52c	LAMP PANEL LED CUAD EMP 12W 100-240V VERT SPS-010	26815	11	6.00	2025-10-24 00:47:16.88	2025-10-24 00:47:16.88	\N	\N	\N	simple	t	f	visible	\N	
988	7616bb69-3f1c-4901-9bae-33bd0be9b1cd	LAMP PANEL LED  48W 30X120 85-277V NANUM PL-B300-1200	27371	3	25.00	2025-10-24 00:47:16.901624	2025-10-24 00:47:16.901624	\N	\N	\N	simple	t	f	visible	\N	
989	824e46ee-9813-4c5d-af72-3b2c0a17dc18	LAMP PANEL LED CUAD EMP 36W 60X60 85-265V LUMISTAR LED87	27153	8	44.00	2025-10-24 00:47:16.921672	2025-10-24 00:47:16.921672	\N	\N	\N	simple	t	f	visible	\N	
990	143c8b6e-3120-47fc-ba3d-641d951ba206	LAMP PANEL LED RED SUP 12+4W BLCO-FUCSIA 85-265V PDSR-124P VERT	28493	6	7.00	2025-10-24 00:47:16.943454	2025-10-24 00:47:16.943454	\N	\N	\N	simple	t	f	visible	\N	
991	9a8b311a-d021-4084-b116-e2cb94027c33	LAMP PANEL LED RED EMP ROSADO/FUCSIA 5W 100-240W D/TONO VERT PDP-E55	28591	21	4.00	2025-10-24 00:47:16.966716	2025-10-24 00:47:16.966716	\N	\N	\N	simple	t	f	visible	\N	
992	38cdb247-5360-43ee-98ef-5034d8d66e99	LAMP PANEL LED RED EMP 36W 85-265V VERT DSR-366	29276	6	11.00	2025-10-24 00:47:17.003227	2025-10-24 00:47:17.003227	\N	\N	\N	simple	t	f	visible	\N	
993	452819bc-36f7-40a7-a0eb-3d7ab4635f1c	LAMP PANEL LED 18W CUAD EMP LED67 LUMISTAR	27548	3	7.00	2025-10-24 00:47:17.027542	2025-10-24 00:47:17.027542	\N	\N	\N	simple	t	f	visible	\N	
994	c0c0c290-49e3-4ad4-b563-362324a0f32c	LAMP PANEL LED CUAD SUP 24W  LED76 LUMISTAR	29969	11	12.00	2025-10-24 00:47:17.032684	2025-10-24 00:47:17.032684	\N	\N	\N	simple	t	f	visible	\N	
995	915a7b10-2fcc-420f-bbd2-a34d65a988d9	LAMP PANEL LED CUAD EMP 9W 110-277V ZQ-TKF BJ LIGHT	28209	1	5.00	2025-10-24 00:47:17.054879	2025-10-24 00:47:17.054879	\N	\N	\N	simple	t	f	visible	\N	
996	c24ac821-4408-4866-8ca6-5d167573d74b	LAMP PANEL LED CUAD EMP 18W 85-265V HAMMER FHE-141218C	31163	5	7.00	2025-10-24 00:47:17.07642	2025-10-24 00:47:17.07642	\N	\N	\N	simple	t	f	visible	\N	
997	6e1ad0cc-8f6c-4db0-bdc3-48b688f01209	LAMP PANEL LED 24W CUAD EMP LED68 LUMISTAR	27902	6	11.00	2025-10-24 00:47:17.102308	2025-10-24 00:47:17.102308	\N	\N	\N	simple	t	f	visible	\N	
998	3446dd7d-0e18-4b8c-a6e3-dfc2c62a1274	LAMP PANEL LED CUAD EMP 9W COLMENA L/BLANCA  85-265V VERT PCEG-96	28066	15	6.00	2025-10-24 00:47:17.124573	2025-10-24 00:47:17.124573	\N	\N	\N	simple	t	f	visible	\N	
999	e162ed52-2e21-4bef-9906-1987a52b8a66	LAMP PANEL LED CUAD SUP  25W 85-265V LED25WPCS1 INSTALLED	30055	16	8.00	2025-10-24 00:47:17.147011	2025-10-24 00:47:17.147011	\N	\N	\N	simple	t	f	visible	\N	
1000	a1510392-2157-4a17-9a11-c5e356b999c0	LAMP PANEL LED CUAD EMP 15W 110-277V ZQ-TKF BJ	31118	9	6.00	2025-10-24 00:47:17.171461	2025-10-24 00:47:17.171461	\N	\N	\N	simple	t	f	visible	\N	
1001	1c53fa57-9023-4d84-ae75-67231208bb7f	LAMP PANEL LED RED EMP 9W 85-265V LED164 LUMISTAR	31758	40	4.00	2025-10-24 00:47:17.192237	2025-10-24 00:47:17.192237	\N	\N	\N	simple	t	f	visible	\N	
1002	3ae35386-4d1f-4959-a5d2-d95e8ead1a77	LAMP PANEL LED 12W CUAD EMP LED66 LUMISTAR	31890	16	5.00	2025-10-24 00:47:17.215133	2025-10-24 00:47:17.215133	\N	\N	\N	simple	t	f	visible	\N	
1003	0ad2859b-72ef-40cf-bb0c-43bf590a6e78	LAMP PANEL LED DECORATIVA NEGRA 8W L/RGB VERT LA8-8RN	32479	5	20.00	2025-10-24 00:47:17.237451	2025-10-24 00:47:17.237451	\N	\N	\N	simple	t	f	visible	\N	
1004	edafb98a-0815-417b-b5c3-ad4954333446	LAMP PANEL LED RED EMP 12W 85-265V VERT SRR-126N	32498	3	7.00	2025-10-24 00:47:17.259273	2025-10-24 00:47:17.259273	\N	\N	\N	simple	t	f	visible	\N	
1005	8ee92e9d-14cc-4a8a-9a81-78dc9e23e703	LAMP PANEL LED RED EMP 12W 85-265V VERT PDP-E12	32500	18	6.00	2025-10-24 00:47:17.296017	2025-10-24 00:47:17.296017	\N	\N	\N	simple	t	f	visible	\N	
1006	df4968a5-2c9b-41c7-986f-7143199e0813	LAMP PANEL LED RED EMP EMP 18W 85-265V LED165 LUMISTAR	32572	14	4.00	2025-10-24 00:47:17.320347	2025-10-24 00:47:17.320347	\N	\N	\N	simple	t	f	visible	\N	
1007	26bf021c-76bb-46c6-b04f-670647abcd4d	LAMP PANEL LED CUAD EMP 15W 85-265V HAMMER FHE-141215C	33145	22	8.00	2025-10-24 00:47:17.340774	2025-10-24 00:47:17.340774	\N	\N	\N	simple	t	f	visible	\N	
1008	0356fc80-3f92-4e47-9cd0-ea955d51e5e7	LAMP PANEL LED CUAD SUP L/CALIDA 18W 110-277V ZQ-TKFM-3K BJ LIGHT	33305	26	11.00	2025-10-24 00:47:17.361359	2025-10-24 00:47:17.361359	\N	\N	\N	simple	t	f	visible	\N	
1009	26b2e12b-c5ad-404d-9ee1-5025d54235bf	LAMP PANEL LED CUAD EMP 24W COLMENA 85-265V VERT PCEG-246	33318	14	14.00	2025-10-24 00:47:17.379468	2025-10-24 00:47:17.379468	\N	\N	\N	simple	t	f	visible	\N	
1010	0cbdd9bb-21f7-4a34-bf79-cf4ea3c668a3	LAMP PANEL LED CUAD SUP 6W 85-265V VERT EPCS-66	33470	1	3.00	2025-10-24 00:47:17.39919	2025-10-24 00:47:17.39919	\N	\N	\N	simple	t	f	visible	\N	
1011	7b132f00-73d7-4cd3-8079-83a4d960cdb7	LAMP PANEL LED RED EMP 18W 85-265V VERT DSR-186	33933	3	7.00	2025-10-24 00:47:17.423495	2025-10-24 00:47:17.423495	\N	\N	\N	simple	t	f	visible	\N	
1012	c2f0d0e2-67d1-4296-a3d3-dbf27326f94f	LAMP PANEL LED RED EMP 20W 110-277V ZQ-TKY BJ	34307	5	6.00	2025-10-24 00:47:17.448869	2025-10-24 00:47:17.448869	\N	\N	\N	simple	t	f	visible	\N	
1013	fe61b2ec-5efe-45e5-9265-5c585ee56649	LAMP PANEL LED CUAD SUP 48W 60X60 85-277V LUMISTAR/LED86	34371	9	58.00	2025-10-24 00:47:17.467726	2025-10-24 00:47:17.467726	\N	\N	\N	simple	t	f	visible	\N	
1014	2b1df00a-a0b7-42a9-8bf6-e860598e41cd	LAMP PANEL LED 6W RED EMP LED57 LUMISTAR	34577	10	3.00	2025-10-24 00:47:17.491058	2025-10-24 00:47:17.491058	\N	\N	\N	simple	t	f	visible	\N	
1015	1d85caa5-1cbf-4bcc-80d7-bec60ba16a64	LAMP PANEL LED CUAD EMP 50W 60X60CM  PROLIGHT	34630	1	15.00	2025-10-24 00:47:17.527286	2025-10-24 00:47:17.527286	\N	\N	\N	simple	t	f	visible	\N	
1016	ef242906-7123-4809-a5b6-6f4a66fcf142	LAMP PANEL LED RED SUP 18W  SPLENDOR/PROLIGHT	34745	1	4.00	2025-10-24 00:47:17.55068	2025-10-24 00:47:17.55068	\N	\N	\N	simple	t	f	visible	\N	
1017	5ab89116-e0a1-4184-9bee-6e80e83aaea5	LAMP PANEL LED CUAD EMP  6W 110-277V ZQ-TKF  BJ	34818	3	4.00	2025-10-24 00:47:17.572138	2025-10-24 00:47:17.572138	\N	\N	\N	simple	t	f	visible	\N	
1018	808b268c-9e9f-4066-8e9e-bcdbe49029d2	LAMP PANEL LED CUAD EMP 12W PROLIGHT/VENILUNCA	34819	50	3.00	2025-10-24 00:47:17.591035	2025-10-24 00:47:17.591035	\N	\N	\N	simple	t	f	visible	\N	
1019	ea163bdf-26d7-432c-8846-45d967d0843f	LAMP PANEL LED CUAD SUP 24W 100-240V VERT SPS-024	24313	8	11.00	2025-10-24 00:47:17.608712	2025-10-24 00:47:17.608712	\N	\N	\N	simple	t	f	visible	\N	
1020	f3b5ca0c-a19c-4065-a5be-68887cc1a554	CILINDRO PERA 60MM VISALOCK CAPRI 91002662	22615	59	11.00	2025-10-24 00:47:17.629516	2025-10-24 00:47:17.629516	\N	\N	\N	simple	t	f	visible	\N	
1021	d4e3d0e0-cf6b-4c2d-abfb-d80ae1897924	CILINDRO PERA ASTRAL/EUROPERFIL CISA 12640104	22616	16	47.00	2025-10-24 00:47:17.650409	2025-10-24 00:47:17.650409	\N	\N	\N	simple	t	f	visible	\N	
1022	a4f01d3f-ba4d-46cf-98a1-6ab9b9ab0e85	CILINDRO PERA 8310-7 60MM CISA	22618	22	27.00	2025-10-24 00:47:17.667836	2025-10-24 00:47:17.667836	\N	\N	\N	simple	t	f	visible	\N	
1023	94a99637-9e6f-4e8d-803e-79da22a5569b	CILINDRO SUELTO ZAMACK CISA	24475	12	28.00	2025-10-24 00:47:17.684931	2025-10-24 00:47:17.684931	\N	\N	\N	simple	t	f	visible	\N	
1024	ca9839a1-6324-456f-a385-9b7de700841a	CILINDRO PERA JGO 3PZ IGUALADOS GATER	28358	31	33.00	2025-10-24 00:47:17.699177	2025-10-24 00:47:17.699177	\N	\N	\N	simple	t	f	visible	\N	
1025	26f8d89c-ca01-4c13-82c5-abf0ad106121	CILINDRO PERA 60MM TAURO CIL1000	28719	27	4.00	2025-10-24 00:47:17.711405	2025-10-24 00:47:17.711405	\N	\N	\N	simple	t	f	visible	\N	
1026	68eb1274-1ef1-4a0b-aff2-f995b054479f	CILINDRO PERA 60MM EXXEL PN20245 05-014-016	31800	19	9.00	2025-10-24 00:47:17.727232	2025-10-24 00:47:17.727232	\N	\N	\N	simple	t	f	visible	\N	
1027	6e3322db-414d-4c57-992c-ecb269b8600d	SILICON TRANSP 85CC MULTIUSO ALADINO CA08	22123	22	3.00	2025-10-24 00:47:17.742332	2025-10-24 00:47:17.742332	\N	\N	\N	simple	t	f	visible	\N	
1028	d8ba3b1b-f634-4c2e-988e-8c940bf05749	SILICON NEGRO 85CC MULTIUS ALADINO CA10	22161	38	3.00	2025-10-24 00:47:17.759155	2025-10-24 00:47:17.759155	\N	\N	\N	simple	t	f	visible	\N	
1029	9d2a2e49-8f23-48b4-8e68-2efea114d49a	SILICON BLANCO 85CC MULTIUS ALADINO CA11	22193	24	3.00	2025-10-24 00:47:17.775194	2025-10-24 00:47:17.775194	\N	\N	\N	simple	t	f	visible	\N	
1030	9c1129c8-de7b-4ea2-9cd2-8ce56d0bab81	SILICON TRANSP 70ML S.BOND/SILIPEX TUBO (PP)	22504	40	3.00	2025-10-24 00:47:17.791306	2025-10-24 00:47:17.791306	\N	\N	\N	simple	t	f	visible	\N	
1031	355ead44-a374-4ae6-8cd3-b9b0b400cefe	SILICON ROJO 70ML BOND/SILIPEX   (PP)	22505	2	5.00	2025-10-24 00:47:17.808324	2025-10-24 00:47:17.808324	\N	\N	\N	simple	t	f	visible	\N	
1032	46f91648-d7b3-4f6c-beb6-e29a2211f662	SILICON GRIS 85GR MEGA GREY GASKET MAKER	22510	34	3.00	2025-10-24 00:47:17.824606	2025-10-24 00:47:17.824606	\N	\N	\N	simple	t	f	visible	\N	
1033	dc6bc9a2-d79e-4acf-825e-a0081b0bda8b	SILICON TRANSP CART 280ML C/FUNGICIDA ALADINO CA03	22512	192	5.00	2025-10-24 00:47:17.837785	2025-10-24 00:47:17.837785	\N	\N	\N	simple	t	f	visible	\N	
1034	f826b120-96ad-49fa-baf4-f90aa5d80fa8	SILICON TRANSP 145 CC  SILIPEX	25408	11	5.00	2025-10-24 00:47:17.851053	2025-10-24 00:47:17.851053	\N	\N	\N	simple	t	f	visible	\N	
1035	9e758dd1-da01-4521-ab2b-6f052eb4b83b	SILICON BLANCO CART 280ML MULTIUSO ALADINO CA02	25689	36	5.00	2025-10-24 00:47:17.878751	2025-10-24 00:47:17.878751	\N	\N	\N	simple	t	f	visible	\N	
1036	e87a1ca2-f69c-460e-b0ea-b346c36df7d5	SILICON GRIS 85ML ALADINO CA13	25706	41	3.00	2025-10-24 00:47:17.896086	2025-10-24 00:47:17.896086	\N	\N	\N	simple	t	f	visible	\N	
1037	60629873-6ba8-4168-9704-c8e60c2626dd	SILICON NEGRO  CART 290ML SILIPEX	27358	8	8.00	2025-10-24 00:47:17.91188	2025-10-24 00:47:17.91188	\N	\N	\N	simple	t	f	visible	\N	
1038	27be16d8-8b89-426e-ba02-eda69520e8e2	SILICON NEGRO CART 280ML MULTIUSO ALADINO CA09	28534	5	5.00	2025-10-24 00:47:17.926103	2025-10-24 00:47:17.926103	\N	\N	\N	simple	t	f	visible	\N	
1039	e21a1113-e526-47aa-ae0d-13a35e133b23	SILICON SPRAY ULTRA ABRILLANTADOR LIMON 354CC SQ	31172	3	7.00	2025-10-24 00:47:17.94365	2025-10-24 00:47:17.94365	\N	\N	\N	simple	t	f	visible	\N	
1040	a68c5d75-7df4-4c94-b5dc-e3f2ed680d25	SILICON TRANSP CART 290ML SILIPEX	31771	6	8.00	2025-10-24 00:47:17.9639	2025-10-24 00:47:17.9639	\N	\N	\N	simple	t	f	visible	\N	
1041	2be3fe9a-7e9e-4d65-91c1-d58613b3e795	SILICON TRANSP CART 270ML TEK BOND 6982	32537	2	5.00	2025-10-24 00:47:17.977412	2025-10-24 00:47:17.977412	\N	\N	\N	simple	t	f	visible	\N	
1042	88e784e5-762f-40a7-ac9c-670fcaf96b7b	SILICON NEGRO CART 300ML TEK BOND	33543	9	5.00	2025-10-24 00:47:17.993853	2025-10-24 00:47:17.993853	\N	\N	\N	simple	t	f	visible	\N	
1043	06a79c5f-0e1f-4d23-9e1e-9e160bd69b61	ESMERIL ANG 7" 2200W STANLEY SL227 ESM-705	21148	4	264.00	2025-10-24 00:47:18.01098	2025-10-24 00:47:18.01098	\N	\N	\N	simple	t	f	visible	\N	
1044	53eb1e83-ce58-46ef-8cb7-cc994d083bd6	ESMERIL ANG 7" 2200W BOSCH GWS-2200-180	23102	3	251.00	2025-10-24 00:47:18.032944	2025-10-24 00:47:18.032944	\N	\N	\N	simple	t	f	visible	\N	
1045	b89f25d6-a133-4bef-b2c9-1e771305d16e	ESMERIL ANG 4 1/2 710W BOSCH GWS700	23103	2	117.00	2025-10-24 00:47:18.038345	2025-10-24 00:47:18.038345	\N	\N	\N	simple	t	f	visible	\N	
1046	7e356e6d-9563-482a-ac10-958824e6be93	ESMERIL ANG 7" 2000W 8450 RPM ANGLE GRINDER UAG200018 INGCO	24737	5	137.00	2025-10-24 00:47:18.043676	2025-10-24 00:47:18.043676	\N	\N	\N	simple	t	f	visible	\N	
1047	26e35336-febd-4a0d-ad8a-626f32cca543	ESMERIL ANG TAKIMA 7" 2000W TKAG2000-18 323519	24747	1	117.00	2025-10-24 00:47:18.063077	2025-10-24 00:47:18.063077	\N	\N	\N	simple	t	f	visible	\N	
1048	0e2530cc-ce38-479a-b372-adf8f603e447	ESMERIL ANG 4 1/2 850W TKAG850-115 TAKIMA 527978	24919	3	75.00	2025-10-24 00:47:18.068602	2025-10-24 00:47:18.068602	\N	\N	\N	simple	t	f	visible	\N	
1049	b35fa883-b354-4964-8d46-75cbe60e84f0	ESMERIL ANG 7" 2200W DEWALT DWE491 ESME-702	27242	3	484.00	2025-10-24 00:47:18.074142	2025-10-24 00:47:18.074142	\N	\N	\N	simple	t	f	visible	\N	
1050	b892de0e-4629-40a4-84cb-9ab26412b1a7	ESMERIL ANG 4 1/2 820W C/ACCESORIOS BLACK&amp;DECKER G720K ESM-715	27941	1	80.00	2025-10-24 00:47:18.080419	2025-10-24 00:47:18.080419	\N	\N	\N	simple	t	f	visible	\N	
1051	9d9a3a0b-2c23-47a5-b42c-b31ac7e5f459	ESMERIL ANG 4 1/2 850W COVO CV-ESME-45-850W 10029	28281	2	71.00	2025-10-24 00:47:18.086077	2025-10-24 00:47:18.086077	\N	\N	\N	simple	t	f	visible	\N	
1052	ff419e88-141d-4c50-be40-8327fb3a58a0	ESMERIL ANG 4 1/2 750W INGCO UAG75028	28946	8	51.00	2025-10-24 00:47:18.105678	2025-10-24 00:47:18.105678	\N	\N	\N	simple	t	f	visible	\N	
1053	35dd20b1-4977-4bca-96dd-b1df88cfec0b	ESMERIL ANG 9" 2400W 6500RPM DEWALT DWE4559 ESM-704	29673	2	661.00	2025-10-24 00:47:18.130602	2025-10-24 00:47:18.130602	\N	\N	\N	simple	t	f	visible	\N	
1054	2329c245-e63f-43f3-836c-4c0a32fbacf8	ESMERIL ANG 4-1/2  920W C/6 DISCO 8 G720X6D-B3	30919	3	76.00	2025-10-24 00:47:18.151575	2025-10-24 00:47:18.151575	\N	\N	\N	simple	t	f	visible	\N	
1055	23fd265d-5dca-4912-8475-dab346e86b8d	ESMERIL ANG 4 1/2 750W COVO CV-ESME-45-750W 11463	30928	7	56.00	2025-10-24 00:47:18.156826	2025-10-24 00:47:18.156826	\N	\N	\N	simple	t	f	visible	\N	
1056	5edc81dd-91a3-4f6d-bb62-f33065088384	ESMERIL ANG 7 2000W 8400RPM 120V PRO-ES2000	32477	2	208.00	2025-10-24 00:47:18.176166	2025-10-24 00:47:18.176166	\N	\N	\N	simple	t	f	visible	\N	
1057	45c93598-3b07-44db-8478-ea40e1f70033	ESMERIL ANG 4 1/2 800W DEWALT DWE4020	32926	3	249.00	2025-10-24 00:47:18.211634	2025-10-24 00:47:18.211634	\N	\N	\N	simple	t	f	visible	\N	
1058	14059331-cf90-4d64-9ff4-af5e68c7c0ba	RODILLO C/FUNDA 9" NIKATO NIK-P13877	32953	11	3.00	2025-10-24 00:47:18.233391	2025-10-24 00:47:18.233391	\N	\N	\N	simple	t	f	visible	\N	
1059	84949e79-cde5-4a57-ad88-f3f58416c614	PROTECTOR AIRE/ACOND Y REFIG 110V PTV007 LUMISTAR	34732	6	15.00	2025-10-24 00:47:18.239573	2025-10-24 00:47:18.239573	\N	\N	\N	simple	t	f	visible	\N	
1060	30ffc39a-f925-4abe-87ac-3dd96dd910aa	ESMERIL ANG 4 1/2 INALAM 20V + ACC INGCO UCAGLI271532	40509	1	210.00	2025-10-24 00:47:18.263646	2025-10-24 00:47:18.263646	\N	\N	\N	simple	t	f	visible	\N	
1061	fb9b8d6e-05b5-441f-bbeb-5ced75fec618	TALADRO 3/8 (10MM) PERC 450W BOSCH GSB450	23104	2	132.00	2025-10-24 00:47:18.287955	2025-10-24 00:47:18.287955	\N	\N	\N	simple	t	f	visible	\N	
1062	a52f8161-30be-4d9c-879d-ff8984d3d665	TALADRO 1/2 PERC 650W DWD024 DEWALT TAL-704	25711	6	228.00	2025-10-24 00:47:18.304626	2025-10-24 00:47:18.304626	\N	\N	\N	simple	t	f	visible	\N	
1063	4fc51794-6a2d-4005-91e0-805b153a871b	TALADRO PERC 1/2" 1050W COVO CV-TAL1050W 9981	31430	2	124.00	2025-10-24 00:47:18.325067	2025-10-24 00:47:18.325067	\N	\N	\N	simple	t	f	visible	\N	
1064	641bcb0b-45fb-4b4c-bc86-a620debfd546	LLAVE IMPACTO 1/2 INALAM 20V INGCO UCIWLI2040	31639	3	162.00	2025-10-24 00:47:18.344354	2025-10-24 00:47:18.344354	\N	\N	\N	simple	t	f	visible	\N	
1065	56c12ed8-0045-4111-9c3b-549506a7ad12	ESMERIL ANG 4 1/2" 750W TOLSEN 79720	35665	10	50.00	2025-10-24 00:47:18.365601	2025-10-24 00:47:18.365601	\N	\N	\N	simple	t	f	visible	\N	
1066	b4ee078e-9aeb-4a84-9151-6005c0ba84b5	TALADRO INALAM 3/8 + ACC INGCO UCDLI20453	40524	1	115.00	2025-10-24 00:47:18.383835	2025-10-24 00:47:18.383835	\N	\N	\N	simple	t	f	visible	\N	
1067	93e0d94f-b136-4b8d-8b49-734353362201	TALADRO 1/2 IMPACTO INALAM 20V + ACC INGCO UCIDLI20668	40828	3	137.00	2025-10-24 00:47:18.412066	2025-10-24 00:47:18.412066	\N	<a href="http://54.89.189.238/wp-content/uploads/2025/05/40828-01.jpg"><img class="alignnone size-medium wp-image-10204" src="http://54.89.189.238/wp-content/uploads/2025/05/40828-01-300x300.jpg" alt="" width="300" height="300" /></a> <a href="http://54.89.189.238/wp-content/uploads/2025/05/40828-02.jpg"><img class="alignnone size-medium wp-image-10205" src="http://54.89.189.238/wp-content/uploads/2025/05/40828-02-300x300.jpg" alt="" width="300" height="300" /></a> <a href="http://54.89.189.238/wp-content/uploads/2025/05/40828-03.jpg"><img class="alignnone size-medium wp-image-10206" src="http://54.89.189.238/wp-content/uploads/2025/05/40828-03-300x300.jpg" alt="" width="300" height="300" /></a> <a href="http://54.89.189.238/wp-content/uploads/2025/05/40828-04.jpg"><img class="alignnone size-medium wp-image-10207" src="http://54.89.189.238/wp-content/uploads/2025/05/40828-04-300x300.jpg" alt="" width="300" height="300" /></a> <a href="http://54.89.189.238/wp-content/uploads/2025/05/40828-05.jpg"><img class="alignnone size-medium wp-image-10208" src="http://54.89.189.238/wp-content/uploads/2025/05/40828-05-300x300.jpg" alt="" width="300" height="300" /></a>	\N	simple	t	f	visible	\N	
1068	8046808f-12e0-40ef-8852-35dbf0e6b9f7	CUCHILLA GUADAÑADORA LIVIANA 351625PU BELLOTA CUC91	21059	0	3.00	2025-10-24 00:47:18.436702	2025-10-24 00:47:18.436702	\N	\N	\N	simple	t	f	visible	\N	
1069	815cc41e-44d8-41f1-ae49-7db190b7762e	PICO PUNT/PALA 4,5LB 809-OSP/608-OP PICO1/PIC03 BELLOTA	21063	9	31.00	2025-10-24 00:47:18.44985	2025-10-24 00:47:18.44985	\N	\N	\N	simple	t	f	visible	\N	
1070	9182e9f4-5e80-43fb-9f04-e39741c3847b	ESCARDILLA 1,8LBS 2-A BELLOTA AZA08	21518	6	21.00	2025-10-24 00:47:18.463012	2025-10-24 00:47:18.463012	\N	\N	\N	simple	t	f	visible	\N	
1071	e6653a0a-863a-49e8-b4aa-171247db171c	PALA P/CUAD C/CABO M/PLAST DORADA 5502-7 MAR BELLOTA PAL18	21783	1	19.00	2025-10-24 00:47:18.476754	2025-10-24 00:47:18.476754	\N	\N	\N	simple	t	f	visible	\N	
1072	bd81a48e-74b1-4a88-81b9-5885dd5bfeba	PALA P/CUAD C/CABO LARGO MADERA BELLOTA 5502-7ML PAL23	21789	1	18.00	2025-10-24 00:47:18.493116	2025-10-24 00:47:18.493116	\N	\N	\N	simple	t	f	visible	\N	
1073	2ed06fba-be6b-4fe6-89ae-20c034cc5cd5	ESCOBA JARD PLAST 22D C/C 5370-22 BELLOTA RAS11	21841	7	7.00	2025-10-24 00:47:18.511616	2025-10-24 00:47:18.511616	\N	\N	\N	simple	t	f	visible	\N	
1074	44ce1eb5-c854-4ad3-9991-cdd3af7a74b3	HACHA MULTIUSO C/C MUL-TIHACH32 BELLOTA HAC05	21869	3	27.00	2025-10-24 00:47:18.545746	2025-10-24 00:47:18.545746	\N	\N	\N	simple	t	f	visible	\N	
1075	26277299-208a-4182-ac7c-e7044fcc6ae2	BARRA PARA HOYAR 16 LBS 5989 BELLOTA	21871	0	65.00	2025-10-24 00:47:18.562465	2025-10-24 00:47:18.562465	\N	\N	\N	simple	t	f	visible	\N	
1076	586d29e4-6936-4fa6-8c28-ddabc7b0bb26	SIERRA MULTIPROPOPSITO 2000W TAKIMA TKFOS-10-A	33475	1	620.00	2025-10-24 00:47:18.576238	2025-10-24 00:47:18.576238	\N	\N	\N	simple	t	f	visible	\N	
1077	b1e787f6-61a3-4538-847d-cc7c0e7ee85d	MOTOBOMB AUT DIESEL 3X3 9,3HP 9-23CCD-F DOMOSA	33805	1	1206.00	2025-10-24 00:47:18.582143	2025-10-24 00:47:18.582143	\N	\N	\N	simple	t	f	visible	\N	
1078	36b80eda-bcde-450d-8b44-6ee26cf8a19b	TIJERA PODAR PEQ 3501-20 BELLOTA TIJ242	21885	2	17.00	2025-10-24 00:47:18.612047	2025-10-24 00:47:18.612047	\N	\N	\N	simple	t	f	visible	\N	
1079	16e18a16-7195-43f4-b76c-529a8870e429	LIMA TRIANG 8 C/M 4081-8 BELLOTA LIM175	21889	27	4.00	2025-10-24 00:47:18.629864	2025-10-24 00:47:18.629864	\N	\N	\N	simple	t	f	visible	\N	
1080	4a862d8a-73d8-436d-88e7-ea9b2d9e0e65	LIMA TRIANG 4081-6 S/M BELLOTA LIM32	21890	27	2.00	2025-10-24 00:47:18.647551	2025-10-24 00:47:18.647551	\N	\N	\N	simple	t	f	visible	\N	
1081	527b5311-a44c-4a99-aacb-e1be26efeb5a	LIMA TRIANG 4087-6 C/M BELLOTA LIM31	21891	67	2.00	2025-10-24 00:47:18.66169	2025-10-24 00:47:18.66169	\N	\N	\N	simple	t	f	visible	\N	
1082	8eed85b9-9d55-41d0-b89c-f51b31cf2b03	LIMA TRIANG 4081-7 C/M BELLOTA LIM110	21893	23	4.00	2025-10-24 00:47:18.67905	2025-10-24 00:47:18.67905	\N	\N	\N	simple	t	f	visible	\N	
1083	85f32399-4392-4781-a9c6-26fa16290dc7	LIMA MOTOSIERRA 5/32 854050 BELLOTA LIM34	21894	24	2.00	2025-10-24 00:47:18.69608	2025-10-24 00:47:18.69608	\N	\N	\N	simple	t	f	visible	\N	
1084	134ddd5f-d666-4fa4-a3c7-4339e256c89d	HACHA 3.5LBS S/C 8125 BELLOTA HAC03	21943	4	20.00	2025-10-24 00:47:18.701739	2025-10-24 00:47:18.701739	\N	\N	\N	simple	t	f	visible	\N	
1085	bafc1b1c-ac6d-40e0-a3f6-ce60687bf498	MACHETE ROZAD 18" M/MAD 104-18 BELLOTA MAC00	21979	14	8.00	2025-10-24 00:47:18.720102	2025-10-24 00:47:18.720102	\N	\N	\N	simple	t	f	visible	\N	
1086	3b22c689-cf19-4a2c-853e-e678071d7896	MACHETE ROZAD 20 M/M 104-20 BELLOTA MAC10	21980	8	9.00	2025-10-24 00:47:18.735801	2025-10-24 00:47:18.735801	\N	\N	\N	simple	t	f	visible	\N	
1087	3a2d1e31-8c44-4784-bed3-85220a546284	MACHETE LIN 20"  M/MAD  1778-20PMM BELLOTA	21983	5	8.00	2025-10-24 00:47:18.750622	2025-10-24 00:47:18.750622	\N	\N	\N	simple	t	f	visible	\N	
1088	9ca95323-b0ab-4534-bf71-79554fa6fcac	MACHETE RULA 22 PUL 706-22PPR M/PLAST/ROJO BELLOTA MAC75	21988	12	7.00	2025-10-24 00:47:18.765732	2025-10-24 00:47:18.765732	\N	\N	\N	simple	t	f	visible	\N	
1089	12fe8a74-2328-4bb1-8477-34b9350ae9c2	MACHETE RULA 24" 706-24PPN M/PLAST/NEGR BELLOTA MAC76	21989	18	9.00	2025-10-24 00:47:18.7815	2025-10-24 00:47:18.7815	\N	\N	\N	simple	t	f	visible	\N	
1090	756fcb35-c79f-42b2-8c9d-13b10781c939	MACHETE LIN 22  M/M  BELLOTA NOGAL 1778-22 MAC04	21984	24	10.00	2025-10-24 00:47:18.797433	2025-10-24 00:47:18.797433	\N	\N	\N	simple	t	f	visible	\N	
1091	15c0e268-c323-44f6-8941-02436f79f838	LIMA MOTOSIERR 4050-7/32 BELLOTA LIM36	21998	30	2.00	2025-10-24 00:47:18.810749	2025-10-24 00:47:18.810749	\N	\N	\N	simple	t	f	visible	\N	
1092	2f9f715e-7994-42c2-9dba-1009b4c99289	ARCO SEGUETA 12" 4618-12 BELLOTA ARC13	21993	3	14.00	2025-10-24 00:47:18.825593	2025-10-24 00:47:18.825593	\N	\N	\N	simple	t	f	visible	\N	
1093	07bae692-7cfe-4cd9-bddb-0077dfab45ac	PALA HOYADORA S/C BELLOTA 5505-H PAL21	22394	4	13.00	2025-10-24 00:47:18.846473	2025-10-24 00:47:18.846473	\N	\N	\N	simple	t	f	visible	\N	
1094	ffe314c0-1c2d-40a8-9add-34bdae69986b	MACHETE ROZAD 18 M/G/ROJO 104-18 BELLOTA MAC20	23869	1	9.00	2025-10-24 00:47:18.864656	2025-10-24 00:47:18.864656	\N	\N	\N	simple	t	f	visible	\N	
1095	28ee3b4f-84e1-4a32-b8f5-68e926b15e17	MACHETE ROZADOR 18" M/MAD PULIDO 104-18 BELLOTA  MAC40	23870	76	11.00	2025-10-24 00:47:18.881577	2025-10-24 00:47:18.881577	\N	\N	\N	simple	t	f	visible	\N	
1096	49d6b765-149d-4096-b8bc-3614722624c2	MACHETE LIN 20" M/G/ROJO 1778-20 B/M BELLOTA MAC09	24159	7	7.00	2025-10-24 00:47:18.91274	2025-10-24 00:47:18.91274	\N	\N	\N	simple	t	f	visible	\N	
1097	f4f9ecd8-c06c-4418-90b1-2ae45d864912	PALA P/RED S/CAB  5582-4 BELLOTA PAL37	25150	6	13.00	2025-10-24 00:47:18.930718	2025-10-24 00:47:18.930718	\N	\N	\N	simple	t	f	visible	\N	
1098	434734e0-784d-499f-bf96-e3bd97045f43	HACHA S/CAB 4LB  8125 BELLOTA HAC04	25170	2	21.00	2025-10-24 00:47:18.94453	2025-10-24 00:47:18.94453	\N	\N	\N	simple	t	f	visible	\N	
1099	89270fcb-8e7a-4694-8e37-2e6487ea5864	FUMIGADOR MANUAL 5LTS BELLOTA 315639 FUM24	25420	4	35.00	2025-10-24 00:47:18.961419	2025-10-24 00:47:18.961419	\N	\N	\N	simple	t	f	visible	\N	
1100	bf47d801-dd04-4e51-9f0a-8353f8bc265d	MACHETE LIN 22  M/M  BELLOTA PULIDO 1778-22 MAC07/MAC04	25733	1	8.00	2025-10-24 00:47:18.986434	2025-10-24 00:47:18.986434	\N	\N	\N	simple	t	f	visible	\N	
1101	adf5e719-4d4e-418d-8b81-289f772a504d	ESCOBA JARD PLAST 40D C/C 5370-40 BELLOTA RAS10	26906	7	13.00	2025-10-24 00:47:19.003885	2025-10-24 00:47:19.003885	\N	\N	\N	simple	t	f	visible	\N	
1102	db053a0e-11b8-4511-b590-4275558377bc	PALA DRAGA C/CABO MAD 307320CM BELLOTA PAL33	26999	4	35.00	2025-10-24 00:47:19.021313	2025-10-24 00:47:19.021313	\N	\N	\N	simple	t	f	visible	\N	
1103	de37a129-a9da-45ef-aef3-8e7d1889ed36	MACHETE  12" M/PLAST C/FUNDA NQBM BELLOTA MAC80	27023	15	15.00	2025-10-24 00:47:19.037679	2025-10-24 00:47:19.037679	\N	\N	\N	simple	t	f	visible	\N	
1104	2081fca7-644b-4faa-92b9-66fd7eddb83f	MANDARRIA 8LBS C/MANG PLAST 5203-8 CFB BELLOTA MAZ00	27047	4	54.00	2025-10-24 00:47:19.057129	2025-10-24 00:47:19.057129	\N	\N	\N	simple	t	f	visible	\N	
1105	a3a0178f-409d-4469-ba3d-5a7012b4c316	PALA P/CUAD S/CAB  BELLOTA 5583-4 PAL26	27787	4	13.00	2025-10-24 00:47:19.076043	2025-10-24 00:47:19.076043	\N	\N	\N	simple	t	f	visible	\N	
1106	4b2f454e-4ae3-4950-8d92-1980186b98f5	PALUSTRA DENTADA 5876 BELLOTA	27801	2	13.00	2025-10-24 00:47:19.09339	2025-10-24 00:47:19.09339	\N	\N	\N	simple	t	f	visible	\N	
1107	57bb34d5-c8d6-4d9b-b7f7-3cf9f4e1e299	CINTA MET 3MTX10MM BELLOTA MTPWC35/10157 CIN30	27871	4	5.00	2025-10-24 00:47:19.11048	2025-10-24 00:47:19.11048	\N	\N	\N	simple	t	f	visible	\N	
1108	c1dd4bd6-7cff-444c-92de-5153b8c4189e	CINTA MET 8MTSX26MM BELLOTA MTPWC85/101578 CIN32	27873	5	9.00	2025-10-24 00:47:19.134633	2025-10-24 00:47:19.134633	\N	\N	\N	simple	t	f	visible	\N	
1109	7e393026-f03a-4c9c-beac-d4cfc5f1d4f2	FUMIGADOR D/ESPALDA 20LTS FMB-20 BELLOTA FUM25	28342	3	73.00	2025-10-24 00:47:19.152499	2025-10-24 00:47:19.152499	\N	\N	\N	simple	t	f	visible	\N	
1110	e4867cef-b08e-42cc-be00-585fc32ae1ad	MACHETE ROZAD 20" M/GOM  104-20 BELLOTA MAC21	29202	37	7.00	2025-10-24 00:47:19.171803	2025-10-24 00:47:19.171803	\N	\N	\N	simple	t	f	visible	\N	
1111	2a15726d-6669-417f-b3ad-512c693dc37b	MACHETE ROZAD 22" M/G NEGRO 104-22NBM BELLOTA MAC22	29203	13	7.00	2025-10-24 00:47:19.18962	2025-10-24 00:47:19.18962	\N	\N	\N	simple	t	f	visible	\N	
1113	b9cb84e4-b87c-448a-b792-2f45a47adc9c	MACHETE PEQ 12" JUNGLA 465-12PPN // 465-12PBM BELLOTA MAC82	30274	9	25.00	2025-10-24 00:47:19.223294	2025-10-24 00:47:19.223294	\N	\N	\N	simple	t	f	visible	\N	
1114	0240444d-1fee-4aa7-a91e-7149cd610efe	PALA P/RED C/CABO M/PLAST TIBURON 5560-2 MAPC 1M BELLOTA PAL44	30238	2	14.00	2025-10-24 00:47:19.26257	2025-10-24 00:47:19.26257	\N	\N	\N	simple	t	f	visible	\N	
1115	61166b9a-335c-4eea-a81c-86bd9b809849	MACHETE PEQ 14" PULID M/P/NEGR 460-PPN BELLOTA MAC37	30275	6	10.00	2025-10-24 00:47:19.277375	2025-10-24 00:47:19.277375	\N	\N	\N	simple	t	f	visible	\N	
1116	66b45a11-d6c0-446d-a600-0f9d6d3d41f9	MACHETE PEQ 16" PULID M/P/NEGR 16PPN BELLOTA MAC38	31459	14	10.00	2025-10-24 00:47:19.294522	2025-10-24 00:47:19.294522	\N	\N	\N	simple	t	f	visible	\N	
1117	6925e641-86c7-4ba0-84a6-67b9dc056403	FUMIGADOR MANUAL 1.5LT BELLOTA FUM23	31694	4	11.00	2025-10-24 00:47:19.311428	2025-10-24 00:47:19.311428	\N	\N	\N	simple	t	f	visible	\N	
1118	be785169-34a8-452d-9729-c5a515011ae6	CINCEL PUNT 5821 20X350 (3/4X14) BELLOTA CIN165	31891	5	22.00	2025-10-24 00:47:19.327975	2025-10-24 00:47:19.327975	\N	\N	\N	simple	t	f	visible	\N	
1119	c03e7b1c-2933-493e-a732-985cecc24c7d	LIMA ESCOFIN P/MAD TOP SHARP 14" 4132-14 RAF BELLOTA LIM16	31962	3	17.00	2025-10-24 00:47:19.341243	2025-10-24 00:47:19.341243	\N	\N	\N	simple	t	f	visible	\N	
1120	78887134-d753-433d-975c-1b005b8570ef	RASTRILLO MET 12D C/C RAK12METRHDL BELLOTA RAS19	32409	35	16.00	2025-10-24 00:47:19.357723	2025-10-24 00:47:19.357723	\N	\N	\N	simple	t	f	visible	\N	
1121	e77ef325-2a24-4812-9804-c5812d513b57	PALA P/RED C/CABO M/PLAST DORADA SHP602DMA BELLOTA PAL38	32410	4	20.00	2025-10-24 00:47:19.377292	2025-10-24 00:47:19.377292	\N	\N	\N	simple	t	f	visible	\N	
1122	7bbe656b-0c85-43f9-9d97-5abfd0a92e53	CINTA MET 5MTSX16MM BELLOTA 101575 CIN31	32925	28	6.00	2025-10-24 00:47:19.39466	2025-10-24 00:47:19.39466	\N	\N	\N	simple	t	f	visible	\N	
1123	14158c39-786a-49a1-af79-47f5629e5128	MACHETE RULA 22" C/NEGRA 127H-22 PPN BELLOTA MAC45	33013	6	7.00	2025-10-24 00:47:19.421405	2025-10-24 00:47:19.421405	\N	\N	\N	simple	t	f	visible	\N	
1124	8e9a8c3b-746e-4d1f-a7d4-3f7fe7c0bd01	MARTILLO CARP M/M 8001-CP 16 ONZ BELLOTA MAR47	33527	15	16.00	2025-10-24 00:47:19.438193	2025-10-24 00:47:19.438193	\N	\N	\N	simple	t	f	visible	\N	
1125	6ce67c77-1417-452b-b7d8-2ce33b341364	PALUSTRA LISA M/MAD 5864 BELLOTA LLA85	33647	6	15.00	2025-10-24 00:47:19.455362	2025-10-24 00:47:19.455362	\N	\N	\N	simple	t	f	visible	\N	
1126	5102e80e-fa8c-4917-8c40-69d5576f42e3	MARTILLO CARP 15OZ M/M 8001-BP BELLOTA MAR42	33881	2	15.00	2025-10-24 00:47:19.468901	2025-10-24 00:47:19.468901	\N	\N	\N	simple	t	f	visible	\N	
1127	537a7b94-621d-45d7-98cd-d417cf24c432	PICO PUNTA/PALA 5LBS S/CABO BELLOTA PIC02/809-AP PIC02	35554	1	31.00	2025-10-24 00:47:19.484464	2025-10-24 00:47:19.484464	\N	\N	\N	simple	t	f	visible	\N	
1128	af9f54c4-208f-4c1d-b4e1-36003dfd933a	LLAVE LAV MONOM CROM NAVAGIO L111 FAGUAX	20884	8	52.00	2025-10-24 00:47:19.497615	2025-10-24 00:47:19.497615	\N	\N	\N	simple	t	f	visible	\N	
1129	5e377cb6-d548-46ae-a673-2bd3fb5cb5bb	LLAVE LAV IND ORBIT CROM FP. 02LV05	22479	8	45.00	2025-10-24 00:47:19.517838	2025-10-24 00:47:19.517838	\N	\N	\N	simple	t	f	visible	\N	
1130	7aea10b7-17d0-423c-bfeb-89c0aed2efad	LLAVE LAV MONOM CROM PRESTIGE BAJO C/2CANILL 30GLV0072 FP	22624	3	164.00	2025-10-24 00:47:19.533203	2025-10-24 00:47:19.533203	\N	\N	\N	simple	t	f	visible	\N	
1131	f43afa83-2360-45fb-8dca-8e7e4950f110	LLAVE LAV IND ENERGY FP 02LV04	22824	8	51.00	2025-10-24 00:47:19.548051	2025-10-24 00:47:19.548051	\N	\N	\N	simple	t	f	visible	\N	
1132	221e2c33-d160-4fee-b1ef-a12c5bb8c195	LLAVE LAV MONOM CROM ROSE GOLD PRESTIGE ALTO C/2CANILL 30GLV0073RG FP	22829	3	287.00	2025-10-24 00:47:19.56286	2025-10-24 00:47:19.56286	\N	\N	\N	simple	t	f	visible	\N	
1133	1095459a-2a20-4cf2-9f9e-fabe90f4f5d4	LLAVE LAV IND METAL M/CROWN LLA-101	23388	5	31.00	2025-10-24 00:47:19.583432	2025-10-24 00:47:19.583432	\N	\N	\N	simple	t	f	visible	\N	
1134	5554c861-cd02-48fe-8c2c-85eb8f1c32f5	LLAVE LAV IND MET LLA-32 USY	23389	26	13.00	2025-10-24 00:47:19.604372	2025-10-24 00:47:19.604372	\N	\N	\N	simple	t	f	visible	\N	
1135	237544ec-e21d-44fd-b230-bfed0c606821	LLAVE FREG MONOM C/SENSOR ACERO/INOX PLA-005 MET.ALEADOS	22389	3	85.00	2025-10-24 00:47:19.642879	2025-10-24 00:47:19.642879	\N	\N	\N	simple	t	f	visible	\N	
1136	fd9b2f4f-a89b-4eb5-bc8b-a1737e04c3d6	LLAVE LAV IND MET LLA-33 USY	23390	9	12.00	2025-10-24 00:47:19.662317	2025-10-24 00:47:19.662317	\N	\N	\N	simple	t	f	visible	\N	
1137	2dc0e12c-a643-4db1-bac7-f9da9225285a	LLAVE LAV MONOM METAL GUN PRESTIGE ALTO C/2CANILL 30GLV0073GM FP	23719	3	214.00	2025-10-24 00:47:19.680238	2025-10-24 00:47:19.680238	\N	\N	\N	simple	t	f	visible	\N	
1138	9b6ee4b3-d8d4-4333-9607-c62922c27693	LLAVE LAV IND MET LLL-A124 GDESEO	24095	15	11.00	2025-10-24 00:47:19.707543	2025-10-24 00:47:19.707543	\N	\N	\N	simple	t	f	visible	\N	
1139	9359b2e9-5532-46aa-aa80-2c25d93b963c	LLAVE LAV IND PLAST BLANCA GRIVEN A367-ZF321 7975	24190	1	3.00	2025-10-24 00:47:19.723663	2025-10-24 00:47:19.723663	\N	\N	\N	simple	t	f	visible	\N	
1140	9509ca12-4eed-46c4-bd40-05b387b69680	LLAVE LAV IND VIENA MET097 METALES ALEADOS	24199	4	16.00	2025-10-24 00:47:19.739386	2025-10-24 00:47:19.739386	\N	\N	\N	simple	t	f	visible	\N	
1141	52d04447-cae2-42f5-83f2-e5bf25f6fef8	LLAVE LAV IND NEGRA T/CASCADA MONM/MEZCL C/2CANILLAS PRI-052	24290	3	115.00	2025-10-24 00:47:19.758623	2025-10-24 00:47:19.758623	\N	\N	\N	simple	t	f	visible	\N	
1142	8eff72cf-c521-4530-a5aa-164c43a79763	LLAVE LAV MONOM CROM PRESTIGE ALTO C/2CANILL 30GLV0073 FP	24554	2	225.00	2025-10-24 00:47:19.78179	2025-10-24 00:47:19.78179	\N	\N	\N	simple	t	f	visible	\N	
1143	30bbc379-11db-4a24-9e09-f85a36402498	LLAVE LAV IND PLAST BLANCA GRIVEN A367-ZF322	24793	16	3.00	2025-10-24 00:47:19.805578	2025-10-24 00:47:19.805578	\N	\N	\N	simple	t	f	visible	\N	
1144	7b9ab9c2-ce6e-4718-8cb8-d3d7327aff40	LLAVE LAV IND SHARK L26 FAGUAX	25070	12	10.00	2025-10-24 00:47:19.824282	2025-10-24 00:47:19.824282	\N	\N	\N	simple	t	f	visible	\N	
1145	0bd55cd9-5d29-45af-b23d-fa30569ffa6c	LLAVE LAV MONOM METAL GUN PRESTIGE BAJO C/2CANILL 30GLV0072GM FP	25298	3	214.00	2025-10-24 00:47:19.840575	2025-10-24 00:47:19.840575	\N	\N	\N	simple	t	f	visible	\N	
1146	7e7b722a-7e67-47b3-a378-aa83e2800410	LLAVE LAV  ROCKET FAGUAX L25	26303	3	10.00	2025-10-24 00:47:19.860653	2025-10-24 00:47:19.860653	\N	\N	\N	simple	t	f	visible	\N	
1147	4822bdb2-d80c-42a8-ad77-ddc3c6bc7d9b	LLAVE LAV DEVIL RAY L27 FAGUAX	26802	13	9.00	2025-10-24 00:47:19.875712	2025-10-24 00:47:19.875712	\N	\N	\N	simple	t	f	visible	\N	
1148	738e21f1-5a7f-4fac-86f3-34602e3331d7	LLAVE LAV IND METAL LLL-A107 GDESEO	27332	51	9.00	2025-10-24 00:47:19.894745	2025-10-24 00:47:19.894745	\N	\N	\N	simple	t	f	visible	\N	
1149	2b798608-21cb-432c-8d55-3bec45039a16	LLAVE LAV MONOM METAL CROM MATE MET-660 METALES ALEADOS	28375	2	82.00	2025-10-24 00:47:19.913783	2025-10-24 00:47:19.913783	\N	\N	\N	simple	t	f	visible	\N	
1150	ca7d8984-5a07-4723-924c-c4b9f128e7bb	LLAVE LAV MONOM BLANCA PRI-064W  METALES ALEADOS	28384	2	30.00	2025-10-24 00:47:19.952108	2025-10-24 00:47:19.952108	\N	\N	\N	simple	t	f	visible	\N	
1151	3805d91e-3248-44a7-a0b2-cfc097ac4cea	LLAVE LAV MONOM BLANCA PRI-065W METALES ALEADOS	28455	2	63.00	2025-10-24 00:47:19.979308	2025-10-24 00:47:19.979308	\N	\N	\N	simple	t	f	visible	\N	
1152	72ac232c-4930-4749-8752-3c1d6c7fd8d6	LLAVE LAV MONOM ORO MATE METALES ALEADOS PRI-065MG	28785	5	93.00	2025-10-24 00:47:20.002232	2025-10-24 00:47:20.002232	\N	\N	\N	simple	t	f	visible	\N	
1153	ba2d2096-f0ea-4dd9-bf55-83c5d7582ef1	LLAVE LAV PLAST/CROM C/CISNE BPL-2L03 MET-ALIADOS	29674	27	11.00	2025-10-24 00:47:20.022127	2025-10-24 00:47:20.022127	\N	\N	\N	simple	t	f	visible	\N	
1154	d1fca470-f723-4141-a1f2-91189f5733b4	CAJA ORGANIZAD COLMENA AZUL	32666	21	6.00	2025-10-24 00:47:20.04158	2025-10-24 00:47:20.04158	\N	\N	\N	simple	t	f	visible	\N	
1155	00439671-d81e-4a8a-99d8-cf59ba28e60a	LLAVE LAV MONOM CROM ROSE GOLD PRESTIGE BAJO C/2CANILL 30GLV0072RG FP	33910	2	211.00	2025-10-24 00:47:20.060362	2025-10-24 00:47:20.060362	\N	\N	\N	simple	t	f	visible	\N	
1156	cd3fd0b1-6b70-41bf-ae71-7c2cee43a420	LLAVE LAV IND PLAST 1/2 ABS M/CRUZ NEGRA BPL-2305N METALES ALEADOS	34481	0	5.00	2025-10-24 00:47:20.088694	2025-10-24 00:47:20.088694	\N	\N	\N	simple	t	f	visible	\N	
1157	195326b6-fb17-4b1f-a066-dac785dc3bf4	LLAVE LAV IND PVC VPP-110 GDESEO	34899	20	3.00	2025-10-24 00:47:20.106263	2025-10-24 00:47:20.106263	\N	\N	\N	simple	t	f	visible	\N	
1158	4d14e584-2b93-4009-a2a8-bb0686efe9a9	LLAVE LAV IND PVC ALTA VPP-111 GDESEO	34900	7	5.00	2025-10-24 00:47:20.119148	2025-10-24 00:47:20.119148	\N	\N	\N	simple	t	f	visible	\N	
1159	73a2dadc-4a51-40a8-967c-ad7e1f99be6b	LLAVE FREG CUELLO CISNE FERMETAL GRI-37	22931	9	13.00	2025-10-24 00:47:20.135409	2025-10-24 00:47:20.135409	\N	\N	\N	simple	t	f	visible	\N	
1160	5606c6bd-572b-4e7d-86c5-4ed50b5e1e9c	LLAVE FREG MONOM GUN GREY PRI-068 METALES ALEADOS	22957	5	159.00	2025-10-24 00:47:20.156576	2025-10-24 00:47:20.156576	\N	\N	\N	simple	t	f	visible	\N	
1161	92768a0a-f315-4dd1-af3e-48cac61b50f3	LLAVE FREG MONOM CROM 2FUNC BENAGI G94 FAGUAX	24067	9	79.00	2025-10-24 00:47:20.179327	2025-10-24 00:47:20.179327	\N	\N	\N	simple	t	f	visible	\N	
1162	83f7d57e-89f4-49b6-a4ce-21c269e9d681	LLAVE FREG IND MONOM CROM BLU-0008 BLUE DREAMS MET ALEAD	24225	0	25.00	2025-10-24 00:47:20.184697	2025-10-24 00:47:20.184697	\N	\N	\N	simple	t	f	visible	\N	
1163	a0e70d4c-bf18-46a4-9f81-6bcd519e6e60	LLAVE FREG MONOM BLU-0011 BLUE DREAMS MET ALEAD	24227	12	84.00	2025-10-24 00:47:20.208191	2025-10-24 00:47:20.208191	\N	\N	\N	simple	t	f	visible	\N	
1164	450cf778-6e5a-4b03-87c6-0bc04deccb5e	LLAVE FREG CUELLO CISNE PVC GPP-203 SEMILIC	25073	16	5.00	2025-10-24 00:47:20.228214	2025-10-24 00:47:20.228214	\N	\N	\N	simple	t	f	visible	\N	
1165	09728794-e2e6-4ca2-a694-39db4225bc6e	LLAVE FREG MONOM DORADO  GRIVEN A367-GMF-602	25466	4	37.00	2025-10-24 00:47:20.247233	2025-10-24 00:47:20.247233	\N	\N	\N	simple	t	f	visible	\N	
1166	35b03251-3a35-4805-bc06-66a4a44d1245	LLAVE FREG FLEXIBLE MONOM AMARILLO MET-613 METALES ALEADOS	26930	5	42.00	2025-10-24 00:47:20.282768	2025-10-24 00:47:20.282768	\N	\N	\N	simple	t	f	visible	\N	
1167	dbfeb395-7a68-4591-98e4-578facbd1eaa	LLAVE FREG C/NEGRO MEZCL/AGUA  C/2CANILLAS PRI-055 METALES ALEADOS	27701	3	81.00	2025-10-24 00:47:20.300074	2025-10-24 00:47:20.300074	\N	\N	\N	simple	t	f	visible	\N	
1168	43fe1972-6dd9-4156-9538-3bc5a5e82062	LLAVE FREG MONOM CROM MET-663 METALES ALEADOS	28374	0	54.00	2025-10-24 00:47:20.319187	2025-10-24 00:47:20.319187	\N	\N	\N	simple	t	f	visible	\N	
1169	aa544b5a-1467-4bf7-9d53-bf183e8a64c9	LLAVE FREG MONOM CROM PRI-069 METALES ALEADOS	28379	1	139.00	2025-10-24 00:47:20.341473	2025-10-24 00:47:20.341473	\N	\N	\N	simple	t	f	visible	\N	
1170	cb8b0849-6369-4d60-a9fc-8d1f615ab964	LLAVE FREG MONOM NEGRA MET-651 METALES ALEADOS	28381	2	36.00	2025-10-24 00:47:20.347004	2025-10-24 00:47:20.347004	\N	\N	\N	simple	t	f	visible	\N	
1171	4b8a8647-c926-49dd-aebc-dc20895598dd	LLAVE FREG MONOM GUN GREY PRI-066GG METALES ALEADOS	28458	3	133.00	2025-10-24 00:47:20.363746	2025-10-24 00:47:20.363746	\N	\N	\N	simple	t	f	visible	\N	
1172	e6b90605-ae7f-4312-b6ba-ff20c7569025	LLAVE FREG MONOM BLANCA PRI-066W METALES ALEADOS	28459	3	109.00	2025-10-24 00:47:20.384491	2025-10-24 00:47:20.384491	\N	\N	\N	simple	t	f	visible	\N	
1173	1a25cc50-7219-400e-8f97-725f9eec10d3	LLAVE FREG MONOM CROM SAN BLAS G89 FAGUAX	28499	8	34.00	2025-10-24 00:47:20.408088	2025-10-24 00:47:20.408088	\N	\N	\N	simple	t	f	visible	\N	
1174	50640c1f-97d3-474e-9c3b-3c8f20117bdd	LLAVE FREG MET 2FUNC NEGRO C/2CANIL INDONESIA FAGUAX G68	29685	13	43.00	2025-10-24 00:47:20.427685	2025-10-24 00:47:20.427685	\N	\N	\N	simple	t	f	visible	\N	
1175	90b85356-16fc-46df-a571-d4e9c2dcfe09	LLAVE FREG C/CISNE MONOM BLU-0012 BLUE DREAMS MET ALEAD	30606	2	14.00	2025-10-24 00:47:20.450011	2025-10-24 00:47:20.450011	\N	\N	\N	simple	t	f	visible	\N	
1176	47bdd998-6009-4c80-bb8d-30dee78cb56e	LLAVE FREG MONOM CROM 2FUNC MALDIVA G87 FAGUAX	31393	5	99.00	2025-10-24 00:47:20.469182	2025-10-24 00:47:20.469182	\N	\N	\N	simple	t	f	visible	\N	
1177	d6b41c41-b0dc-4b56-a7cb-210c5c2f0946	LLAVE FREG C/FLEX CROM 2FUNC GRACE BAY G81 FAGUAX	33340	11	99.00	2025-10-24 00:47:20.4924	2025-10-24 00:47:20.4924	\N	\N	\N	simple	t	f	visible	\N	
1178	db089e1f-d491-43bf-8be4-00b189720af2	LLAVE FREG MONOM PRESTIGE CROM C/2 CANIL 02GF0072 FP	33422	2	225.00	2025-10-24 00:47:20.511767	2025-10-24 00:47:20.511767	\N	\N	\N	simple	t	f	visible	\N	
1179	16e336b7-48f1-45cf-a6b2-42d90a9518bc	GRUP FREG 8 MAN/POMO   FP 02GF03	22823	4	68.00	2025-10-24 00:47:20.53324	2025-10-24 00:47:20.53324	\N	\N	\N	simple	t	f	visible	\N	
1180	cb2ebde5-c448-4883-884b-b6f17a2af323	GRUP FREG MAN/METAL GRI-12	23442	12	33.00	2025-10-24 00:47:20.551341	2025-10-24 00:47:20.551341	\N	\N	\N	simple	t	f	visible	\N	
1181	ec9d4c80-4819-4dbb-b04d-693377450e9f	GRUP FREG 8 PLAST/CR GRI-17 USY	24063	9	15.00	2025-10-24 00:47:20.569449	2025-10-24 00:47:20.569449	\N	\N	\N	simple	t	f	visible	\N	
1182	1693ba50-53b4-4db1-bcb5-28d854391882	GRUP FREG RADIANCE G16 FAGUAX	24102	13	18.00	2025-10-24 00:47:20.585041	2025-10-24 00:47:20.585041	\N	\N	\N	simple	t	f	visible	\N	
1184	f4f4876e-ef9c-4857-9528-98e18713db4b	GRUP FREG NAVIGATOR G13 FAGUAX	24702	29	14.00	2025-10-24 00:47:20.64311	2025-10-24 00:47:20.64311	\N	\N	\N	simple	t	f	visible	\N	
1185	e0c81204-5e82-4997-b9d4-8d6308b5b3be	GRUP FREG 8" BOUMAC BM-CS90304A IDEAL	24876	6	86.00	2025-10-24 00:47:20.662429	2025-10-24 00:47:20.662429	\N	\N	\N	simple	t	f	visible	\N	
1186	8deb1933-1657-49cf-b909-2666b88572f0	GRUP FREG MONOM A INOX 02GF400 FP	25286	2	414.00	2025-10-24 00:47:20.683133	2025-10-24 00:47:20.683133	\N	\N	\N	simple	t	f	visible	\N	
1187	44428386-886c-4563-87fa-97a18bb48263	GRUP FREG MONOM KALI PRI030 MET.ALEADOS	26051	2	106.00	2025-10-24 00:47:20.7055	2025-10-24 00:47:20.7055	\N	\N	\N	simple	t	f	visible	\N	
1188	ead1e695-8a2b-4d4f-98cd-658f05c6449f	GRUP FREG P/CRIST P/CROM GRI-32	26206	10	46.00	2025-10-24 00:47:20.726221	2025-10-24 00:47:20.726221	\N	\N	\N	simple	t	f	visible	\N	
1190	45950078-2c64-4150-bc47-93ecff524621	GRUP FREG 8" MON FP40 C/FLANGE 02GF02	26296	2	144.00	2025-10-24 00:47:20.759904	2025-10-24 00:47:20.759904	\N	\N	\N	simple	t	f	visible	\N	
1191	726ddbd1-7b36-433b-9cd0-1947e6d178af	GRUP FREG MONOM MEZCLAD PRI-057 METAL A.	27315	2	102.00	2025-10-24 00:47:20.775743	2025-10-24 00:47:20.775743	\N	\N	\N	simple	t	f	visible	\N	
1192	94bf52d3-2d9a-47c5-a21a-859cf866d9d9	GRUP FREG MONOM MURCIA PRI005	27325	2	175.00	2025-10-24 00:47:20.795698	2025-10-24 00:47:20.795698	\N	\N	\N	simple	t	f	visible	\N	
1194	80d49409-02bd-4ad1-9249-2a1db9efb515	VASTAGO DUCHA CERAMICO 1/2" GRIVEN CT-WA016	31556	4	6.00	2025-10-24 00:47:20.833684	2025-10-24 00:47:20.833684	\N	\N	\N	simple	t	f	visible	\N	
1195	15439108-509c-4767-97b3-72a12cbcbb9e	GRUP FREG PLAST  BMF-8102 METAL ALEADOS	34466	4	42.00	2025-10-24 00:47:20.853619	2025-10-24 00:47:20.853619	\N	\N	\N	simple	t	f	visible	\N	
1196	9b8d41fc-4012-40de-b844-262bf00a10de	PINT OLEO BRILL AZUL COLON 1 GAL SOLIN 550	20746	76	30.00	2025-10-24 00:47:20.871767	2025-10-24 00:47:20.871767	\N	\N	\N	simple	t	f	visible	\N	
1197	904f79e8-2404-4458-9f24-e0ad105df36c	PINT OLEO BRILL AMAR INTEN 1GL SOLINTE 517	22879	3	31.00	2025-10-24 00:47:20.885768	2025-10-24 00:47:20.885768	\N	\N	\N	simple	t	f	visible	\N	
1198	4232db48-914e-4de3-83c1-8ccfa3d2000f	PINT OLEO BRILL ROJO TEJA 1G SOLINT 537	24810	0	30.00	2025-10-24 00:47:20.900451	2025-10-24 00:47:20.900451	\N	\N	\N	simple	t	f	visible	\N	
1199	bd894657-acf5-44f5-9095-a0181ebdb3a5	PINT OLEO BRILL TURQUES IMPER 1G SOLIN 546	24811	0	30.00	2025-10-24 00:47:20.915085	2025-10-24 00:47:20.915085	\N	\N	\N	simple	t	f	visible	\N	
1200	65972582-e8b7-49f2-891d-ad0313cf71a1	PINT OLEO BRILL AZUL MEDIO 1G SOLINT 554	24813	0	30.00	2025-10-24 00:47:20.929615	2025-10-24 00:47:20.929615	\N	\N	\N	simple	t	f	visible	\N	
1201	e7191870-336e-4364-8854-c064a2ded0fb	PINT OLEO BRILL AZUL CLARO 1GAL SOLINT 555	25110	0	30.00	2025-10-24 00:47:20.957231	2025-10-24 00:47:20.957231	\N	\N	\N	simple	t	f	visible	\N	
1202	0fb1715d-0b64-41d4-aa3f-c286cf3d97a1	PINT OLEO BRILL ROJO LADR 1G SOLINT 538	26011	0	30.00	2025-10-24 00:47:20.970649	2025-10-24 00:47:20.970649	\N	\N	\N	simple	t	f	visible	\N	
1203	3cdfed78-ddad-4a27-8f1e-1eeb1ae0eab5	PINT OLEO BRILL NARANJA 1G SOLINT 530	26007	0	30.00	2025-10-24 00:47:20.9843	2025-10-24 00:47:20.9843	\N	\N	\N	simple	t	f	visible	\N	
1204	f6c95460-e89f-4282-9c11-9bf6e9a20118	PINT OLEO BRILL MARFIL 1GAL SOLINT 510	26706	0	30.00	2025-10-24 00:47:20.997509	2025-10-24 00:47:20.997509	\N	\N	\N	simple	t	f	visible	\N	
1205	a950ac8a-c9d4-4a06-8e12-aebf0e14a64c	PINT OLEO BRILL VERDE TILO 1 G SOLINT 544	27194	0	30.00	2025-10-24 00:47:21.010713	2025-10-24 00:47:21.010713	\N	\N	\N	simple	t	f	visible	\N	
1206	3c28dfe5-447a-43df-b123-92df57d85539	PINT OLEO BRILL MARFIL CLAS 1GAL SOLIN 511	29282	0	30.00	2025-10-24 00:47:21.025424	2025-10-24 00:47:21.025424	\N	\N	\N	simple	t	f	visible	\N	
1207	49a07079-6125-4db7-a70c-a983edde023e	PINT OLEO BRILL CAOBA 1GAL SOLINT 525	26707	0	30.00	2025-10-24 00:47:21.040277	2025-10-24 00:47:21.040277	\N	\N	\N	simple	t	f	visible	\N	
1208	1d40603e-f865-4234-a825-5f4d43f1c20b	PINT OLEO BRILL AMAR MODERN 1G SOLINTE 516	35041	0	31.00	2025-10-24 00:47:21.053886	2025-10-24 00:47:21.053886	\N	\N	\N	simple	t	f	visible	\N	
1209	33956dfb-8dd5-4bba-a31c-11fccdad5f05	PINT PLAST AZUL OCEANO (B) 1G ARADOS	22209	18	16.00	2025-10-24 00:47:21.066695	2025-10-24 00:47:21.066695	\N	\N	\N	simple	t	f	visible	\N	
1210	387c2dbd-7ee8-40b6-ba03-3d8cdde1960e	PINT PLAST BARBIE (B) 1G ARADOS	26014	16	16.00	2025-10-24 00:47:21.0811	2025-10-24 00:47:21.0811	\N	\N	\N	simple	t	f	visible	\N	
1211	b2a2fda2-ab2a-4642-b229-4eb5cfab91e8	PINT PLAST FUCSIA (C) 1GAL DECOMAX	34463	33	7.00	2025-10-24 00:47:21.094242	2025-10-24 00:47:21.094242	\N	\N	\N	simple	t	f	visible	\N	
1212	f94848f1-6f7d-43e0-809f-56cc5b9ea41c	PINT PLAST SATINADO GRIS OSCURO 1GAL D-KOR (B) CAUCS130-1	21883	12	25.00	2025-10-24 00:47:21.107383	2025-10-24 00:47:21.107383	\N	\N	\N	simple	t	f	visible	\N	
1213	dfd9e18b-2fd0-41fc-b644-9ce8154aee87	PINT PLAST SATINADO GREIGE 1GAL D-KOR (B) CAUCS131-1	21884	24	25.00	2025-10-24 00:47:21.12206	2025-10-24 00:47:21.12206	\N	\N	\N	simple	t	f	visible	\N	
1214	35295bd3-76bd-4f5e-9471-3e19421e8af8	PINT PLAST SATINADO AZUL (B) 1G ARADOS	22038	4	24.00	2025-10-24 00:47:21.135954	2025-10-24 00:47:21.135954	\N	\N	\N	simple	t	f	visible	\N	
1215	a0aa1786-4faf-4a30-bbc8-a2a36e3ddc7e	PINT PLAST SATINADO BEIGE (B) 1G ARADOS	22042	6	24.00	2025-10-24 00:47:21.149399	2025-10-24 00:47:21.149399	\N	\N	\N	simple	t	f	visible	\N	
1216	2e1219e8-d2a8-4913-8bcf-899b04c885bf	PINT PLAST SATINADO ROJO CEREZA (B) 1G ARADOS	22052	25	24.00	2025-10-24 00:47:21.163865	2025-10-24 00:47:21.163865	\N	\N	\N	simple	t	f	visible	\N	
1217	1ab27ab3-902e-4f7e-9fec-76f9c0e95d9e	PINT PLAST SATINADO MARFIL (B) 1G ARADOS	22056	8	24.00	2025-10-24 00:47:21.178694	2025-10-24 00:47:21.178694	\N	\N	\N	simple	t	f	visible	\N	
1218	f17238d0-11d6-42e3-a87d-363beb761e5c	PINT PLAST SATINADO ROSA VIEJA (B) 1G ARADOS	22043	6	24.00	2025-10-24 00:47:21.193142	2025-10-24 00:47:21.193142	\N	\N	\N	simple	t	f	visible	\N	
1219	4d91f5c9-8ddc-455a-a4a0-5981ae84e557	PINT PLAST SATINADO VINO (B) 1G ARADOS	22064	1	24.00	2025-10-24 00:47:21.205773	2025-10-24 00:47:21.205773	\N	\N	\N	simple	t	f	visible	\N	
1220	03fcc9d3-73a6-489b-b1fa-7a0b51abf16b	PINT PLAST SATINADO TURQUESA (B) 1G ARADOS	22044	11	24.00	2025-10-24 00:47:21.218609	2025-10-24 00:47:21.218609	\N	\N	\N	simple	t	f	visible	\N	
1221	21cfe130-ad4d-4468-af5f-d55047d6a51b	PINT PLAST SATINADO MANGO (B) 1G ARADOS	22066	8	24.00	2025-10-24 00:47:21.23118	2025-10-24 00:47:21.23118	\N	\N	\N	simple	t	f	visible	\N	
1222	b2a295d4-3002-4908-b32c-d25121d65baa	PINT PLAST SATINADO BLANCO (B) 1G ARADOS STB001	22069	14	24.00	2025-10-24 00:47:21.243949	2025-10-24 00:47:21.243949	\N	\N	\N	simple	t	f	visible	\N	
1223	054456df-5a2e-4070-9d48-b38377ac4c1c	PINT PLAST SATINADO KIWI (B) 1G ARADOS	22071	3	24.00	2025-10-24 00:47:21.257569	2025-10-24 00:47:21.257569	\N	\N	\N	simple	t	f	visible	\N	
1183	05b512df-a9fd-45bf-b8c5-57c846f42697	GRUP FREG SIDNEY G09 FAGUAX	24701	0	39.00	2025-10-24 00:47:20.62004	2025-11-10 10:47:27.992636	\N	\N	\N	simple	t	t	visible	\N	
1189	8560ef6f-2cb3-46d3-9f59-1759cca4a21b	GRUP FREG MONOM MODENA PRI027 MET.ALEADOS	26277	1	191.00	2025-10-24 00:47:20.744309	2025-11-10 10:47:27.997612	\N	\N	\N	simple	t	t	visible	\N	
1224	4479aeae-1f36-472e-9e97-4ea25cf25214	PINT PLAST SATINADO NUGGET (B) 1G ARADOS	22072	5	24.00	2025-10-24 00:47:21.270755	2025-10-24 00:47:21.270755	\N	\N	\N	simple	t	f	visible	\N	
1225	16992c80-603b-4059-9d76-35cb2417d406	PINT PLAST SATINADO GRIS CLARO (B) 1G ARADOS	22075	6	24.00	2025-10-24 00:47:21.284461	2025-10-24 00:47:21.284461	\N	\N	\N	simple	t	f	visible	\N	
1226	d50ebc9c-f9d8-47b3-8607-302a83513e52	PINT PLAST SATINADO VERDE LIMA (B) 1G ARADOS	22090	1	24.00	2025-10-24 00:47:21.297651	2025-10-24 00:47:21.297651	\N	\N	\N	simple	t	f	visible	\N	
1227	73a58775-5f9b-43e5-9abf-4521e7e24370	PINT PLAST SATINADO GRIS CEMENTO (B) 1G ARADOS	22117	5	24.00	2025-10-24 00:47:21.310438	2025-10-24 00:47:21.310438	\N	\N	\N	simple	t	f	visible	\N	
1228	6f1f86e3-6368-4077-ad54-69fdd50518e3	PINT PLAST SATINADO AMARILLO BANANA (B) 1G ARADOS	22128	9	25.00	2025-10-24 00:47:21.323525	2025-10-24 00:47:21.323525	\N	\N	\N	simple	t	f	visible	\N	
1229	5b953c7d-2bf5-4744-b3de-38a829220c8d	PINT PLAST SATINADO ROSA (B) 1G ARADOS	22203	5	24.00	2025-10-24 00:47:21.336038	2025-10-24 00:47:21.336038	\N	\N	\N	simple	t	f	visible	\N	
1230	7b5323b1-d68b-410c-9371-7a312fee8316	PINT PLAST SATINADO VERDE MANZANA (B) 1G ARADOS	22208	8	24.00	2025-10-24 00:47:21.348517	2025-10-24 00:47:21.348517	\N	\N	\N	simple	t	f	visible	\N	
1231	fab8f22d-6223-4cf0-8fbe-58b5fa4246e0	PINT PLAST GRIS OSCURO GAL D-KOR (B) CAUC132-1	21591	17	17.00	2025-10-24 00:47:21.36535	2025-10-24 00:47:21.36535	\N	\N	\N	simple	t	f	visible	\N	
1232	ce975892-c8c0-44d5-bdc1-8a87560c1fad	PINT PLAST GREIGE 1GAL D-KOR (B) CAUCS133-1	21895	22	17.00	2025-10-24 00:47:21.395199	2025-10-24 00:47:21.395199	\N	\N	\N	simple	t	f	visible	\N	
1233	2196c628-ffa1-42d7-a628-248d407aa022	PINT ESMALTE ALTA PROTEC NEGRO BRILL 1G REINCO 7001-001	30312	49	20.00	2025-10-24 00:47:21.408773	2025-10-24 00:47:21.408773	\N	\N	\N	simple	t	f	visible	\N	
1234	9e468320-2157-43dc-963e-a4e398655a26	PINT ESMALTE ALTA PROTEC AMARILLO BRILL 1G REINCO 7003-101	30315	10	24.00	2025-10-24 00:47:21.42235	2025-10-24 00:47:21.42235	\N	\N	\N	simple	t	f	visible	\N	
1235	198edaf0-97ba-4577-b36b-97ad072786d6	PINT ESMALTE ALTA PROTEC AZUL BRILL 1/4G REINCO 7004-002	30334	48	7.00	2025-10-24 00:47:21.436073	2025-10-24 00:47:21.436073	\N	\N	\N	simple	t	f	visible	\N	
1236	ac1207f5-face-4331-a2ce-3725869f813c	PINT ESMALTE ALTA PROTECCION ROJO BRILLANTE 1GAL REINCO 7006-001	24752	11	24.00	2025-10-24 00:47:21.449668	2025-10-24 00:47:21.449668	\N	\N	\N	simple	t	f	visible	\N	
1237	ac109aaa-6bcd-4169-9154-6dbe8ab8a21b	PINT ESMALTE ALTA PROTEC AZUL BRILL 1G REINCO 7004-001	30340	4	24.00	2025-10-24 00:47:21.465399	2025-10-24 00:47:21.465399	\N	\N	\N	simple	t	f	visible	\N	
1238	fc8214ea-6c08-466b-bc25-dd99f36370c8	PINT ESMALTE ALTA PROTEC AMARILLO BRILL 1/4G REINCO 7003-102	30310	22	7.00	2025-10-24 00:47:21.479438	2025-10-24 00:47:21.479438	\N	\N	\N	simple	t	f	visible	\N	
1239	6fdb77ce-03b7-463e-9312-8b8b0d099a43	PINT ESMALTE ALTA PROTEC GRIS BRILL 1G REINCO 7002-001	30664	11	24.00	2025-10-24 00:47:21.492771	2025-10-24 00:47:21.492771	\N	\N	\N	simple	t	f	visible	\N	
1240	d169b8b6-3648-4e1e-8f62-8642e4b5bdca	PINT ESMALTE ALTA PROTEC BLANCO BRILL 1G REINCO 7000-001	30313	26	26.00	2025-10-24 00:47:21.507746	2025-10-24 00:47:21.507746	\N	\N	\N	simple	t	f	visible	\N	
1241	ef571f0c-9927-4586-ad17-2e539ad35726	PINT ESMALTE ALTA PROTEC GRIS BRILL 1/4G REINCO 7002-002	30665	23	7.00	2025-10-24 00:47:21.523801	2025-10-24 00:47:21.523801	\N	\N	\N	simple	t	f	visible	\N	
1242	d4817500-e6ea-4b47-8b21-2dd20e70efd1	PINT ESMALTE ALTA PROTECCION ROJO BRILLANTE 1/4GAL REINCO 7006-002	24753	20	7.00	2025-10-24 00:47:21.538677	2025-10-24 00:47:21.538677	\N	\N	\N	simple	t	f	visible	\N	
1243	5cd6e4b2-24f6-4bf2-a445-45a5e8c2f8d3	PINT ESMALTE ALTA PROTEC BLANCO BRILL 1/4G REINCO 7000-002	30314	50	7.00	2025-10-24 00:47:21.553646	2025-10-24 00:47:21.553646	\N	\N	\N	simple	t	f	visible	\N	
1244	58a9215b-7899-4039-8b73-f308e772c9cc	PINT ESMALTE ALTA PROTEC NEGRO BRILL 1/4G REINCO 7001-002	33314	40	6.00	2025-10-24 00:47:21.570665	2025-10-24 00:47:21.570665	\N	\N	\N	simple	t	f	visible	\N	
1245	a96dfab2-82fd-4b20-bd3e-44f0cff5c349	PINT ESMALTE BRILL CAFE 1G ARADOS VERONA	25431	23	32.00	2025-10-24 00:47:21.597878	2025-10-24 00:47:21.597878	\N	\N	\N	simple	t	f	visible	\N	
1246	adcf0832-f36e-43d3-b85b-964d383657a8	PINT ESMALTE BRILLANTE AMARILLO CATERPILAR 1/4G ARADOS VERONA	30324	15	9.00	2025-10-24 00:47:21.612977	2025-10-24 00:47:21.612977	\N	\N	\N	simple	t	f	visible	\N	
1247	26e850d3-0f86-4690-a5f7-5bf16b00c05f	PINT ESMALTE BRILL 1/4G  AMARILLO MEDIO ARADOS VERONA	30347	22	9.00	2025-10-24 00:47:21.627008	2025-10-24 00:47:21.627008	\N	\N	\N	simple	t	f	visible	\N	
1248	f00e24ff-e817-4178-b990-447b41463b45	PINT ESMALTE BRILL BLANCO 1G ARADOS VERONA	30354	138	32.00	2025-10-24 00:47:21.639661	2025-10-24 00:47:21.639661	\N	\N	\N	simple	t	f	visible	\N	
1249	dd7a4dde-4c27-4136-b1c7-aa1ac010abca	PINT ESMALTE BRILL ROJO 1G ARADOS VERONA	24479	23	32.00	2025-10-24 00:47:21.652281	2025-10-24 00:47:21.652281	\N	\N	\N	simple	t	f	visible	\N	
1250	3d9bd26d-3d4c-4260-b9a1-6a3f778948b8	PINT ESMALTE BRILL AZUL 1G ARADOS VERONA	30362	15	32.00	2025-10-24 00:47:21.665318	2025-10-24 00:47:21.665318	\N	\N	\N	simple	t	f	visible	\N	
1251	b1907721-42d0-4e4d-9320-d3e08452fe74	PINT ESMALTE BRILLANTE VERDE 1/4G ARADOS VERONA	30326	15	9.00	2025-10-24 00:47:21.679466	2025-10-24 00:47:21.679466	\N	\N	\N	simple	t	f	visible	\N	
1252	9eda7131-2bc5-4e7f-a254-0c18c2048f4e	PINT ESMALTE BRILLANTE AMARILLO LIMON 1/4G ARADOS VERONA	30349	21	9.00	2025-10-24 00:47:21.693253	2025-10-24 00:47:21.693253	\N	\N	\N	simple	t	f	visible	\N	
1253	c9605f03-56e1-4fd9-af6e-9ead645dd89d	PINT ESMALTE BRILL MARFIL 1G ARADOS VERONA	30366	27	32.00	2025-10-24 00:47:21.707687	2025-10-24 00:47:21.707687	\N	\N	\N	simple	t	f	visible	\N	
1254	ce1853d7-92af-42c1-a760-9c94eaf196b3	PINT ESMALTE BRILLANTE GRIS OSCURO 1/4G ARADOS VERONA	30350	21	9.00	2025-10-24 00:47:21.722378	2025-10-24 00:47:21.722378	\N	\N	\N	simple	t	f	visible	\N	
1255	f496a865-0db8-4083-9fab-3a12f05eb92d	PINT ESMALTE BRILL NEGRO 1G ARADOS VERONA	30367	38	31.00	2025-10-24 00:47:21.736217	2025-10-24 00:47:21.736217	\N	\N	\N	simple	t	f	visible	\N	
1256	c301ccea-367d-4c5b-89c1-a17eba86d0ac	PINT ESMALTE BRILLANTE GRIS OSCURO 1G ARADOS VERONA	30351	17	32.00	2025-10-24 00:47:21.750805	2025-10-24 00:47:21.750805	\N	\N	\N	simple	t	f	visible	\N	
1257	e91b23f5-16c8-4fe1-891e-105c9e947636	PINT ESMALTE BRILLANTE AZUL 1/4G ARADOS VERONA	30327	19	9.00	2025-10-24 00:47:21.765704	2025-10-24 00:47:21.765704	\N	\N	\N	simple	t	f	visible	\N	
1258	1200e346-05bd-4173-8d6f-0e960e4a0fb6	PINT ESMALTE BRILL AMARILLO MEDIO 1G ARADOS VERONA	30368	21	32.00	2025-10-24 00:47:21.78076	2025-10-24 00:47:21.78076	\N	\N	\N	simple	t	f	visible	\N	
1259	d661fc83-1a9d-435f-ae0e-bf3eaba07f2a	PINT ESMALTE BRILL VERDE 1G ARADOS VERONA	30357	16	32.00	2025-10-24 00:47:21.794539	2025-10-24 00:47:21.794539	\N	\N	\N	simple	t	f	visible	\N	
1260	f249a059-bb0b-4c9e-b8e5-5391fa812c48	PINT ESMALTE BRILL NARANJA 1G ARADOS VERONA	30361	19	32.00	2025-10-24 00:47:21.80804	2025-10-24 00:47:21.80804	\N	\N	\N	simple	t	f	visible	\N	
1261	135bf32b-f004-412a-910e-16adeef57de2	PINT ESMALTE BRILL BLANCO 1/4G ARADOS VERONA	30348	196	9.00	2025-10-24 00:47:21.820536	2025-10-24 00:47:21.820536	\N	\N	\N	simple	t	f	visible	\N	
1262	34d4fce5-4861-4c23-9b9b-91bce7072b94	PINT ESMALTE BRILL AMARILLO LIMON 1G ARADOS	30369	23	32.00	2025-10-24 00:47:21.833431	2025-10-24 00:47:21.833431	\N	\N	\N	simple	t	f	visible	\N	
1263	da87fb21-da74-4ebf-a512-576ba5ca47dc	PINT ESMALTE BRILL GRIS CLARO 1/4G ARADOS VERONA	30363	18	9.00	2025-10-24 00:47:21.84586	2025-10-24 00:47:21.84586	\N	\N	\N	simple	t	f	visible	\N	
1264	009e53ec-b5ec-4f48-a431-1b0414311a71	PINT ESMALTE BRILL NEGRO 1/4G ARADOS VERONA	30360	187	8.00	2025-10-24 00:47:21.859269	2025-10-24 00:47:21.859269	\N	\N	\N	simple	t	f	visible	\N	
1265	fc90c432-a272-4820-9ff5-55ae0cc65c91	PINT ESMALTE BRILL MARFIL 1/4G ARADOS VERONA	30658	20	9.00	2025-10-24 00:47:21.872164	2025-10-24 00:47:21.872164	\N	\N	\N	simple	t	f	visible	\N	
1266	5c80f744-edb7-4f10-9a46-6fa52e6bd9a7	PINT ESMALTE BRILL GRIS CLARO 1G ARADOS VERONA	30365	18	32.00	2025-10-24 00:47:21.885376	2025-10-24 00:47:21.885376	\N	\N	\N	simple	t	f	visible	\N	
1269	415a2425-839e-48a3-9cf3-817a1febab5f	PINT ESMALTE BRILL AMARILLO CATERPILLAR 1G ARADOS VERONA	30341	19	32.00	2025-10-24 00:47:21.926176	2025-10-24 00:47:21.926176	\N	\N	\N	simple	t	f	visible	\N	
1267	f7ff0322-dcbd-4eba-8089-84302a83bb52	PINT ESMALTE BRILL ROJO 1/4G ARADOS VERONA EBARA015	30670	13	9.00	2025-10-24 00:47:21.899407	2025-11-06 14:59:53.414544	\N	\N	\N	simple	t	f	visible	\N	
1112	f18db4f2-c937-4b5d-8a49-682441e76521	TIJERA PODAR MEDIAN 3501-240 BELLOTA 1190025 TIJ240	29346	8	24.00	2025-10-24 00:47:19.204637	2025-11-03 13:10:37.259316	\N	\N	\N	simple	t	t	visible	\N	
1193	9835bd3c-1bb8-4140-aa70-7cf8e3300c7f	GRUP FREG MONOM MEZCLAD PRI-056 METAL A.	31257	2	141.00	2025-10-24 00:47:20.816104	2025-11-04 12:43:38.562658	\N	\N	\N	simple	t	t	visible	\N	
1268	8df3c796-3e06-4217-ad90-d7c2f00a443b	PINT ESMALTE BRILL CAFE 1/4G ARADOS VERONA	30656	18	9.00	2025-10-24 00:47:21.913035	2025-11-06 14:59:53.409188	\N	\N	\N	simple	t	f	visible	\N	
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: shipping_addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipping_addresses (id, first_name, last_name, email, phone, address, city, state, zip_code, country, additional_info, created_at, latitude, longitude) FROM stdin;
1	Cailin	Roberts	duxi@mailinator.com	+1 (704) 651-2663	Do dolores dolore vo	Pariatur Vel volupt	Mollitia eos aut sed	12697	Iste et aliqua Qui 	Aperiam quia dicta v	2025-11-03 10:12:44.680318	\N	\N
2	Cailin	Roberts	djesus1703@gmail.com	+1 (704) 651-2663	Do dolores dolore vo	Pariatur Vel volupt	Mollitia eos aut sed	12697	Iste et aliqua Qui 	Aperiam quia dicta v	2025-11-03 10:17:35.920607	\N	\N
3	Cailin	Roberts	djesus1703@gmail.com	+1 (704) 651-2663	Do dolores dolore vo	Pariatur Vel volupt	Mollitia eos aut sed	12697	Iste et aliqua Qui 	Aperiam quia dicta v	2025-11-03 10:37:51.462875	\N	\N
4	Porter	Rhodes	hexapag@mailinator.com	+1 (396) 497-8522	Illum in distinctio	Excepturi excepteur 	Recusandae Non temp	18296	Odit in enim neque u	Aut officia adipisic	2025-11-03 15:36:36.534781	\N	\N
5	Garrison	Brown	gahufa@mailinator.com	+1 (957) 176-9212	Coordenadas GPS	Por GPS	Por GPS	0000	Venezuela		2025-11-04 12:06:32.824402	8.09814465	-63.48673403
6	Neve	Duncan	djesus1703@gmail.com	+1 (547) 754-1353	Coordenadas GPS	Por GPS	Por GPS	0000	Venezuela	Deserunt sit obcaeca	2025-11-04 12:43:38.450602	8.11870000	-63.55170000
7	Dacey	Mcfadden	riwis@mailinator.com	+1 (452) 683-1615	Odit sint numquam om	Temporibus commodo d	Incididunt ut sed si	83352	Quis eiusmod amet c	Blanditiis quo molli	2025-11-06 14:59:53.339329	\N	\N
8	Admin	Principal	diodi_her_04@hotmail.com	04249428608	Coordenadas GPS	Por GPS	Por GPS	0000	Venezuela		2025-11-10 10:47:27.882031	8.11393372	-63.56082201
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, uuid, first_name, last_name, email, password, created_at, updated_at, role) FROM stdin;
1	0e206841-3a22-4ec5-8a77-f315bbf54580	Admin	Principal	admin@construir.com	$2b$10$Yw2AT/WeROcxmGME0NAjiehE2bcfznq4jFf.HMn1vVsnIa8GlPh9.	2025-10-07 14:16:24.584225	2025-10-07 14:16:24.584225	admin
\.


--
-- Name: banners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.banners_id_seq', 1, true);


--
-- Name: cart_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cart_items_id_seq', 3, true);


--
-- Name: carts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.carts_id_seq', 3, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 101, true);


--
-- Name: discounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.discounts_id_seq', 2, true);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 1, false);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 10, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 8, true);


--
-- Name: payment_info_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_info_id_seq', 8, true);


--
-- Name: product_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_images_id_seq', 1826, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 1269, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 1, false);


--
-- Name: shipping_addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shipping_addresses_id_seq', 8, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: order_items PK_005269d8574e6fac0493715c308; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY (id);


--
-- Name: products PK_0806c755e0aca124e67c0cf6d7d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY (id);


--
-- Name: product_images PK_1974264ea7265989af8392f63a1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT "PK_1974264ea7265989af8392f63a1" PRIMARY KEY (id);


--
-- Name: categories PK_24dbc6126a28ff948da33e97d3b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY (id);


--
-- Name: product_categories PK_54f2e1dbf14cfa770f59f0aac8f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT "PK_54f2e1dbf14cfa770f59f0aac8f" PRIMARY KEY (product_id, category_id);


--
-- Name: discounts PK_66c522004212dc814d6e2f14ecc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT "PK_66c522004212dc814d6e2f14ecc" PRIMARY KEY (id);


--
-- Name: cart_items PK_6fccf5ec03c172d27a28a82928b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT "PK_6fccf5ec03c172d27a28a82928b" PRIMARY KEY (id);


--
-- Name: orders PK_710e2d4957aa5878dfe94e4ac2f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: payment_info PK_b2ba4f3b3f40c6a37e54fb8b252; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_info
    ADD CONSTRAINT "PK_b2ba4f3b3f40c6a37e54fb8b252" PRIMARY KEY (id);


--
-- Name: carts PK_b5f695a59f5ebb50af3c8160816; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT "PK_b5f695a59f5ebb50af3c8160816" PRIMARY KEY (id);


--
-- Name: roles PK_c1433d71a4838793a49dcad46ab; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY (id);


--
-- Name: shipping_addresses PK_cced78984eddbbe24470f226692; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_addresses
    ADD CONSTRAINT "PK_cced78984eddbbe24470f226692" PRIMARY KEY (id);


--
-- Name: banners PK_e9b186b959296fcb940790d31c3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT "PK_e9b186b959296fcb940790d31c3" PRIMARY KEY (id);


--
-- Name: carts REL_2ec1c94a977b940d85a4f498ae; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT "REL_2ec1c94a977b940d85a4f498ae" UNIQUE (user_id);


--
-- Name: orders REL_67b8be57fc38bda573d2a8513e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "REL_67b8be57fc38bda573d2a8513e" UNIQUE (shipping_address_id);


--
-- Name: orders REL_90d86777933726d503af609799; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "REL_90d86777933726d503af609799" UNIQUE (payment_info_id);


--
-- Name: orders UQ_04a64e7c04376e27182f8c0fa17; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "UQ_04a64e7c04376e27182f8c0fa17" UNIQUE (uuid);


--
-- Name: discounts UQ_37a6d68689398082aa3698d7bd4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT "UQ_37a6d68689398082aa3698d7bd4" UNIQUE (uuid);


--
-- Name: banners UQ_3a5fa2d262165cc166a3ee2f958; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT "UQ_3a5fa2d262165cc166a3ee2f958" UNIQUE (uuid);


--
-- Name: categories UQ_420d9f679d41281f282f5bc7d09; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE (slug);


--
-- Name: roles UQ_648e3f5447f725579d7d4ffdfb7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE (name);


--
-- Name: orders UQ_75eba1c6b1a66b09f2a97e6927b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "UQ_75eba1c6b1a66b09f2a97e6927b" UNIQUE (order_number);


--
-- Name: categories UQ_8b0be371d28245da6e4f4b61878; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE (name);


--
-- Name: discounts UQ_8c7cc2340e9ea0fc5a246e63749; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT "UQ_8c7cc2340e9ea0fc5a246e63749" UNIQUE (code);


--
-- Name: users UQ_951b8f1dfc94ac1d0301a14b7e1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_951b8f1dfc94ac1d0301a14b7e1" UNIQUE (uuid);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: products UQ_98086f14e190574534d5129cd7c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "UQ_98086f14e190574534d5129cd7c" UNIQUE (uuid);


--
-- Name: categories UQ_a4b5917e7297f757879582e1458; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "UQ_a4b5917e7297f757879582e1458" UNIQUE (uuid);


--
-- Name: products UQ_c44ac33a05b144dd0d9ddcf9327; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327" UNIQUE (sku);


--
-- Name: carts UQ_f866679bf24f872d7976c3bd833; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT "UQ_f866679bf24f872d7976c3bd833" UNIQUE (uuid);


--
-- Name: IDX_8748b4a0e8de6d266f2bbc877f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_8748b4a0e8de6d266f2bbc877f" ON public.product_categories USING btree (product_id);


--
-- Name: IDX_9148da8f26fc248e77a387e311; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_9148da8f26fc248e77a387e311" ON public.product_categories USING btree (category_id);


--
-- Name: order_items FK_145532db85752b29c57d2b7b1f1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: carts FK_2ec1c94a977b940d85a4f498aea; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT "FK_2ec1c94a977b940d85a4f498aea" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cart_items FK_30e89257a105eab7648a35c7fce; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT "FK_30e89257a105eab7648a35c7fce" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: product_images FK_4f166bb8c2bfcef2498d97b4068; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: orders FK_555d48c77395dc43554c7067ed6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_555d48c77395dc43554c7067ed6" FOREIGN KEY (discount_id) REFERENCES public.discounts(id);


--
-- Name: cart_items FK_6385a745d9e12a89b859bb25623; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT "FK_6385a745d9e12a89b859bb25623" FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: orders FK_67b8be57fc38bda573d2a8513ec; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_67b8be57fc38bda573d2a8513ec" FOREIGN KEY (shipping_address_id) REFERENCES public.shipping_addresses(id);


--
-- Name: product_categories FK_8748b4a0e8de6d266f2bbc877f6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT "FK_8748b4a0e8de6d266f2bbc877f6" FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: orders FK_90d86777933726d503af6097991; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_90d86777933726d503af6097991" FOREIGN KEY (payment_info_id) REFERENCES public.payment_info(id);


--
-- Name: product_categories FK_9148da8f26fc248e77a387e3112; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT "FK_9148da8f26fc248e77a387e3112" FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: order_items FK_9263386c35b6b242540f9493b00; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_9263386c35b6b242540f9493b00" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders FK_a922b820eeef29ac1c6800e826a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict rXcvVA8QpwZqnyo2AGaOEMq2DJhwscAEWlhDOYn952x5FiGSOXi0f8gAQLx1Sg2

