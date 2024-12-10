--
-- PostgreSQL database dump
--

-- Dumped from database version 17.0
-- Dumped by pg_dump version 17.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clients_info; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients_info (
    id integer NOT NULL,
    name character varying(60) NOT NULL,
    surname character varying(60),
    phone_number character varying(60),
    email character varying(60)
);


ALTER TABLE public.clients_info OWNER TO postgres;

--
-- Name: clients_info_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_info_id_seq OWNER TO postgres;

--
-- Name: clients_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_info_id_seq OWNED BY public.clients_info.id;


--
-- Name: contractors_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contractors_services (
    id integer NOT NULL,
    name character varying(60) NOT NULL,
    contractor character varying(60),
    price numeric(10,2) DEFAULT 0 NOT NULL,
    CONSTRAINT positive_price CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.contractors_services OWNER TO postgres;

--
-- Name: contractors_services_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contractors_services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contractors_services_id_seq OWNER TO postgres;

--
-- Name: contractors_services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contractors_services_id_seq OWNED BY public.contractors_services.id;


--
-- Name: deals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deals (
    id integer NOT NULL,
    client_id integer NOT NULL,
    resource_id integer NOT NULL,
    create_date timestamp without time zone NOT NULL,
    close_date timestamp without time zone,
    scheduled_date timestamp with time zone,
    duration integer
);


ALTER TABLE public.deals OWNER TO postgres;

--
-- Name: deals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deals_id_seq OWNER TO postgres;

--
-- Name: deals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deals_id_seq OWNED BY public.deals.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(60) NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    CONSTRAINT positive_price CHECK ((price >= (0)::numeric))
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
-- Name: resources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resources (
    id integer NOT NULL,
    name character varying(60) NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    popularity integer DEFAULT 0,
    CONSTRAINT positive_price CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.resources OWNER TO postgres;

--
-- Name: resources_contractors_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resources_contractors_services (
    contractors_service_id integer NOT NULL,
    amount integer DEFAULT 1 NOT NULL,
    resource_id integer NOT NULL
);


ALTER TABLE public.resources_contractors_services OWNER TO postgres;

--
-- Name: resources_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resources_id_seq OWNER TO postgres;

--
-- Name: resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resources_id_seq OWNED BY public.resources.id;


--
-- Name: resources_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resources_products (
    product_id integer NOT NULL,
    amount integer DEFAULT 1 NOT NULL,
    resource_id integer NOT NULL
);


ALTER TABLE public.resources_products OWNER TO postgres;

--
-- Name: resources_tools; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resources_tools (
    tool_id integer NOT NULL,
    amount integer DEFAULT 1 NOT NULL,
    duration integer DEFAULT 1 NOT NULL,
    resource_id integer NOT NULL
);


ALTER TABLE public.resources_tools OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    session_id character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: tools; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tools (
    id integer NOT NULL,
    name character varying(60) NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    CONSTRAINT positive_price CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.tools OWNER TO postgres;

--
-- Name: tools_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tools_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tools_id_seq OWNER TO postgres;

--
-- Name: tools_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tools_id_seq OWNED BY public.tools.id;


--
-- Name: users_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users_data (
    id integer NOT NULL,
    email character varying(20) NOT NULL,
    password character varying(60) NOT NULL
);


ALTER TABLE public.users_data OWNER TO postgres;

--
-- Name: users_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_data_id_seq OWNER TO postgres;

--
-- Name: users_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_data_id_seq OWNED BY public.users_data.id;


--
-- Name: clients_info id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients_info ALTER COLUMN id SET DEFAULT nextval('public.clients_info_id_seq'::regclass);


--
-- Name: contractors_services id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractors_services ALTER COLUMN id SET DEFAULT nextval('public.contractors_services_id_seq'::regclass);


--
-- Name: deals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals ALTER COLUMN id SET DEFAULT nextval('public.deals_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: resources id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources ALTER COLUMN id SET DEFAULT nextval('public.resources_id_seq'::regclass);


--
-- Name: tools id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tools ALTER COLUMN id SET DEFAULT nextval('public.tools_id_seq'::regclass);


--
-- Name: users_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_data ALTER COLUMN id SET DEFAULT nextval('public.users_data_id_seq'::regclass);


--
-- Name: clients_info clients_info_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients_info
    ADD CONSTRAINT clients_info_email_key UNIQUE (email);


--
-- Name: clients_info clients_info_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients_info
    ADD CONSTRAINT clients_info_phone_number_key UNIQUE (phone_number);


--
-- Name: clients_info clients_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients_info
    ADD CONSTRAINT clients_info_pkey PRIMARY KEY (id);


--
-- Name: contractors_services contractors_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractors_services
    ADD CONSTRAINT contractors_services_pkey PRIMARY KEY (id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: resources_contractors_services resources_contractors_services_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources_contractors_services
    ADD CONSTRAINT resources_contractors_services_pk PRIMARY KEY (contractors_service_id, resource_id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: resources_products resources_products_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources_products
    ADD CONSTRAINT resources_products_pk PRIMARY KEY (product_id, resource_id);


--
-- Name: resources_tools resources_tools_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources_tools
    ADD CONSTRAINT resources_tools_pk PRIMARY KEY (tool_id, resource_id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (session_id);


--
-- Name: tools tools_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tools
    ADD CONSTRAINT tools_pkey PRIMARY KEY (id);


--
-- Name: users_data users_data_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_data
    ADD CONSTRAINT users_data_email_key UNIQUE (email);


--
-- Name: users_data users_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_data
    ADD CONSTRAINT users_data_pkey PRIMARY KEY (id);


--
-- Name: idx_deals_scheduled_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deals_scheduled_date ON public.deals USING btree (scheduled_date);


--
-- Name: deals deals_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients_info(id);


--
-- Name: deals deals_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: resources_contractors_services resources_contractors_services_contractors_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources_contractors_services
    ADD CONSTRAINT resources_contractors_services_contractors_service_id_fkey FOREIGN KEY (contractors_service_id) REFERENCES public.contractors_services(id);


--
-- Name: resources_contractors_services resources_contractors_services_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources_contractors_services
    ADD CONSTRAINT resources_contractors_services_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: resources_products resources_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources_products
    ADD CONSTRAINT resources_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: resources_products resources_products_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources_products
    ADD CONSTRAINT resources_products_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: resources_tools resources_tools_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources_tools
    ADD CONSTRAINT resources_tools_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: resources_tools resources_tools_tool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources_tools
    ADD CONSTRAINT resources_tools_tool_id_fkey FOREIGN KEY (tool_id) REFERENCES public.tools(id);


--
-- PostgreSQL database dump complete
--

