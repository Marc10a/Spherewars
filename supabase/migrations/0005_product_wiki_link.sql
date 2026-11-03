-- Links a sellable product to its miniature in the official wiki (slug of the character page, e.g. 'personajes/mandas-de-urueh/satanor').
-- The faction shop pages list every wiki miniature of the faction; a miniature gets a price and a Buy button only when a
-- published, sellable product points to it. Miniatures without a linked product show "coming soon" (no invented prices).
alter table products add column wiki_slug text;
create index on products (wiki_slug) where wiki_slug is not null;
